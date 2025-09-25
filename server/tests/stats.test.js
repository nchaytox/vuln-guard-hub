import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.METRICS_ENABLED = 'false';

const mockPgListAllScans = jest.fn();

jest.unstable_mockModule('../db-postgres.js', () => ({
  connectDB: jest.fn(),
  getPool: jest.fn(),
  pgListScans: jest.fn(),
  pgListAllScans: mockPgListAllScans,
  pgGetUserByUsername: jest.fn(),
  pgCreateUser: jest.fn(),
  pgCreateScan: jest.fn(),
  pgListScansByUsername: jest.fn(),
  pgUpdateUser: jest.fn(),
  pgGetProfile: jest.fn(),
  pgGetScanByIdForUser: jest.fn(),
}));

const { default: scansRouter } = await import('../routes/scans.js');

let consoleErrorSpy;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

const statsRouteLayer = scansRouter.stack.find((layer) => layer.route?.path === '/stats');
if (!statsRouteLayer) throw new Error('Stats route not registered');
const [authLayer, handlerLayer] = statsRouteLayer.route.stack;

const runStatsRequest = async ({ token, query } = {}) => {
  const req = {
    method: 'GET',
    url: '/api/scans/stats',
    path: '/stats',
    originalUrl: '/api/scans/stats',
    headers: {},
    query: query || {},
  };
  if (token) req.headers.authorization = `Bearer ${token}`;

  let statusCode = 200;
  const headers = {};
  let body;
  let isFinished = false;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      isFinished = true;
      return this;
    },
    send(payload) {
      body = payload;
      isFinished = true;
      return this;
    },
    sendStatus(code) {
      statusCode = code;
      isFinished = true;
      return this;
    },
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get finished() {
      return isFinished;
    },
  };

  const executeLayer = (layer) => new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err); else resolve();
    };
    const maybePromise = layer.handle(req, res, done);
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(() => done()).catch(done);
    } else if (res.finished) {
      done();
    }
  });

  await executeLayer(authLayer);
  if (res.finished) return res;
  await executeLayer(handlerLayer);
  return res;
};

const authToken = jwt.sign({ username: 'alice' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const trivyResult = (severityRecords = []) => ([
  {
    Results: [
      {
        Vulnerabilities: severityRecords.map((severity) => ({ Severity: severity })),
      },
    ],
  },
]);

describe('GET /api/scans/stats', () => {
  beforeEach(() => {
    mockPgListAllScans.mockReset();
  });

  test('returns aggregated statistics from persisted scans', async () => {
    const scans = [
      {
        id: 1,
        type: 'repo',
        target: 'https://github.com/example/repo1',
        result: trivyResult(['CRITICAL', 'HIGH', 'LOW']),
        created_at: '2024-01-10T12:00:00.000Z',
      },
      {
        id: 2,
        type: 'file',
        target: 'package.json',
        result: trivyResult(['MEDIUM', 'LOW']),
        created_at: '2024-01-11T12:00:00.000Z',
      },
      {
        id: 3,
        type: 'repo',
        target: 'https://github.com/example/repo1',
        result: trivyResult([]),
        created_at: '2024-01-12T12:00:00.000Z',
      },
    ];

    mockPgListAllScans.mockResolvedValue(scans);
    const res = await runStatsRequest({ token: authToken });

    expect(mockPgListAllScans).toHaveBeenCalledWith('alice', { type: undefined, start: undefined, end: undefined });
    expect(res.statusCode).toBe(200);
    expect(res.body.totals).toEqual({ CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 2, total: 5 });
    expect(res.body.summary).toMatchObject({
      totalScans: 3,
      resolvedScans: 1,
      scansWithCritical: 1,
      lastScanTarget: 'https://github.com/example/repo1',
      uniqueTargets: 2,
    });
    expect(res.body.trend.map((t) => t.date)).toEqual(['2024-01-10', '2024-01-11', '2024-01-12']);
  });

  test('passes filters to the data layer', async () => {
    mockPgListAllScans.mockResolvedValue([]);

    await runStatsRequest({
      token: authToken,
      query: { type: 'repo', start: '2024-01-01', end: '2024-01-31' },
    });

    expect(mockPgListAllScans).toHaveBeenCalledWith('alice', {
      type: 'repo',
      start: '2024-01-01',
      end: '2024-01-31',
    });
  });

  test('returns 500 when aggregation fails', async () => {
    mockPgListAllScans.mockRejectedValue(new Error('db unavailable'));
    const res = await runStatsRequest({ token: authToken });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to compute scan stats' });
  });

  test('requires authentication', async () => {
    const res = await runStatsRequest();
    expect(res.statusCode).toBe(401);
  });
});

