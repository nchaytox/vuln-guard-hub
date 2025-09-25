import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import client from 'prom-client';
import auth from './authMiddleware.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import scansRouter from './routes/scans.js';
import { validateBody, scanSchema } from './validators.js';
import { execFile } from 'child_process';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

// CORS multi-origins
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '';
const allowedOrigins = allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean);
if (allowedOrigins.length > 0) {
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );
} else {
  app.use(cors());
}

const bodyLimit = process.env.BODY_LIMIT || '1mb';
app.use(express.json({ limit: bodyLimit }));

// Global rate limit
const windowMinutes = parseInt(process.env.RATE_WINDOW_MIN || '15', 10);
const maxRequests = parseInt(process.env.RATE_MAX_REQ || '100', 10);
app.use(
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Metrics
const metricsEnabled = (process.env.METRICS_ENABLED || 'true').toLowerCase() !== 'false';
if (metricsEnabled) {
  client.collectDefaultMetrics({ prefix: 'vulnguard_' });
  app.get('/metrics', async (req, res) => {
    const token = process.env.METRICS_TOKEN || '';
    const allowIpsEnv = process.env.METRICS_ALLOW_IPS || '';
    const allowIps = allowIpsEnv.split(',').map((s) => s.trim()).filter(Boolean);
    if (token) {
      const authz = req.headers['authorization'] || '';
      const expected = `Bearer ${token}`;
      if (authz !== expected) return res.sendStatus(401);
    } else if (allowIps.length > 0) {
      if (!allowIps.includes(req.ip)) return res.sendStatus(403);
    }
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}

app.get('/', (_, res) => res.send('✅ Trivy backend API active'));

// POST /scan (repo)
app.post('/scan', auth, validateBody(scanSchema), (req, res) => {
  const { repoUrl } = req.body || {};
  try {
    const url = new URL(repoUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
      return res.status(400).json({ error: 'URL invalide: uniquement https://github.com/* autorisé' });
    }
    const path = url.pathname;
    const ownerRepo = /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;
    if (!ownerRepo.test(path) || url.search || url.hash || url.username || url.password) {
      return res.status(400).json({ error: 'Format repo GitHub invalide (attendu: https://github.com/owner/repo)' });
    }
  } catch {
    return res.status(400).json({ error: 'repoUrl invalide' });
  }

  const args = ['repo', '--format', 'json', repoUrl];
  const timeoutMs = parseInt(process.env.TRIVY_TIMEOUT_MS || String(5 * 60 * 1000), 10);
  const maxBuffer = parseInt(process.env.TRIVY_MAX_BUFFER_MB || '50', 10) * 1024 * 1024;
  execFile('trivy', args, { timeout: timeoutMs, maxBuffer }, async (error, stdout) => {
    if (error) return res.status(500).json({ error: 'Trivy a échoué' });
    try {
      const json = JSON.parse(stdout || '[]');
      try {
        const { pgCreateScan } = await import('./db-postgres.js');
        const username = req.user?.username || 'anonymous';
        await pgCreateScan({ username, type: 'repo', target: repoUrl, result: json });
      } catch (e) {
        console.warn('Failed to persist repo scan (/scan):', e?.message || e);
      }
      res.json(json);
    } catch {
      res.status(500).json({ error: 'Erreur lors du parsing JSON Trivy' });
    }
  });
});

// Routers
app.use('/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/scans', scansRouter);

export default app;
