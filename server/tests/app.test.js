import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

process.env.METRICS_ENABLED = 'true';
process.env.METRICS_TOKEN = 'secret-token';
process.env.JWT_SECRET = 'test-secret';

const mockDb = {
  connectDB: jest.fn(),
  getPool: jest.fn(),
  pgGetUserByUsername: jest.fn(),
  pgCreateUser: jest.fn(),
  pgCreateScan: jest.fn(),
  pgListScans: jest.fn(),
  pgListAllScans: jest.fn(),
  pgListScansByUsername: jest.fn(),
  pgGetProfile: jest.fn(),
  pgUpdateUser: jest.fn(),
  pgGetScanByIdForUser: jest.fn(),
};

jest.unstable_mockModule('../db-postgres.js', () => mockDb);

const { register } = await import('../authController.js');
const { default: app } = await import('../app.js');

const findRouteHandlers = (method, path) => {
  const stack = app._router.stack;
  for (const layer of stack) {
    if (!layer.route) continue;
    if (layer.route.path === path && layer.route.methods[method]) {
      return layer.route.stack.map((item) => item.handle);
    }
  }
  throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
};

const createMockRes = () => {
  let statusCode = 200;
  let payload;
  let finished = false;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      finished = true;
      return this;
    },
    send(data) {
      payload = data;
      finished = true;
      return this;
    },
    sendStatus(code) {
      statusCode = code;
      finished = true;
      return this;
    },
    set() {
      return this;
    },
    end(data) {
      payload = data;
      finished = true;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return payload;
    },
    get finished() {
      return finished;
    },
  };
  return res;
};

describe('Validation and security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register missing password returns 400', async () => {
    const req = { body: { username: 'userOnly' } };
    const res = createMockRes();
    await register(req, res);
    expect(res.statusCode).toBe(400);
  });

  const [scanAuth, scanValidator, scanHandler] = findRouteHandlers('post', '/scan');

  const runScan = async ({ repoUrl, token }) => {
    const req = {
      body: { repoUrl },
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };
    const res = createMockRes();

    const invoke = (handler) => new Promise((resolve, reject) => {
      let settled = false;
      const done = (err) => {
        if (settled) return;
        settled = true;
        if (err) reject(err); else resolve();
      };
      const maybe = handler(req, res, done);
      if (maybe && typeof maybe.then === 'function') {
        maybe.then(() => done()).catch(done);
      } else if (res.finished) {
        done();
      }
    });

    await invoke(scanAuth);
    if (res.finished) return res;
    await invoke(scanValidator);
    if (res.finished) return res;
    await invoke(scanHandler);
    return res;
  };

  const token = jwt.sign({ username: 'alice' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  test('scan invalid host returns 400', async () => {
    const res = await runScan({ repoUrl: 'https://gitlab.com/owner/repo', token });
    expect(res.statusCode).toBe(400);
  });

  test('scan invalid path returns 400', async () => {
    const res = await runScan({ repoUrl: 'https://github.com/owner/repo/extra', token });
    expect(res.statusCode).toBe(400);
  });

  const metricsHandlers = findRouteHandlers('get', '/metrics');

  const runMetrics = async (headers = {}) => {
    const req = { headers };
    const res = createMockRes();
    let lastError;
    for (const handler of metricsHandlers) {
      try {
        const result = handler(req, res, () => {});
        if (result && typeof result.then === 'function') await result;
      } catch (error) {
        lastError = error;
        break;
      }
    }
    if (lastError) throw lastError;
    return res;
  };

  test('metrics requires token', async () => {
    const resNoAuth = await runMetrics();
    expect([401, 403]).toContain(resNoAuth.statusCode);

    const resAuth = await runMetrics({ authorization: 'Bearer secret-token' });
    expect(resAuth.statusCode).toBe(200);
  });
});

