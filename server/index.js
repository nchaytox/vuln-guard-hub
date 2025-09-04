import express from 'express';
import { execFile } from 'child_process';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import authRouter from './routes/auth.js';
import auth from './authMiddleware.js';
import { connectDB } from './db-postgres.js';
import scansRouter from './routes/scans.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/scan', auth, (req, res) => {
  const { repoUrl } = req.body || {};
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl requis' });

  // Basic validation: only allow github.com HTTPS URLs
  try {
    const url = new URL(repoUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
      return res.status(400).json({ error: 'URL invalide: uniquement https://github.com/* autorisé' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'repoUrl invalide' });
  }

  const args = ['repo', '--format', 'json', repoUrl];

  execFile('trivy', args, async (error, stdout) => {
    if (error) return res.status(500).json({ error: 'Trivy a échoué' });
    try {
      const json = JSON.parse(stdout || '[]');
      // persist scan
      try {
        const { pgCreateScan } = await import('./db-postgres.js');
        const username = req.user?.username || 'anonymous';
        await pgCreateScan({ username, type: 'repo', target: repoUrl, result: json });
      } catch (e) {
        console.warn('Failed to persist repo scan (/scan):', e?.message || e);
      }
      res.json(json);
    } catch (e) {
      res.status(500).json({ error: 'Erreur lors du parsing JSON Trivy' });
    }
  });
});

app.get('/', (_, res) => {
  res.send('✅ Trivy backend API active');
});

// Mount routers for additional endpoints
app.use('/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/scans', scansRouter);

const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Trivy backend is running on http://localhost:${PORT}`);
  });
});
