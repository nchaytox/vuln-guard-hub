import { execFile } from 'child_process';
import fs from 'fs';
import { pgCreateScan } from '../db-postgres.js';

export const scanZipFile = (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Run Trivy filesystem scan on the uploaded file
  const args = ['fs', '--format', 'json', file.path];

  const timeoutMs = parseInt(process.env.TRIVY_TIMEOUT_MS || String(5 * 60 * 1000), 10);
  const maxBuffer = (parseInt(process.env.TRIVY_MAX_BUFFER_MB || '50', 10) * 1024 * 1024);

  execFile('trivy', args, { timeout: timeoutMs, maxBuffer }, async (error, stdout) => {
    const cleanup = () => {
      if (file?.path) fs.unlink(file.path, () => {});
    };
    if (error) {
      cleanup();
      return res.status(500).json({ error: 'Trivy file scan failed' });
    }
    try {
      const json = JSON.parse(stdout || '[]');
      // Persist scan result
      const username = req.user?.username || 'anonymous';
      const target = file.originalname || file.path;
      try {
        await pgCreateScan({ username, type: 'file', target, result: json });
      } catch (e) {
        console.warn('Failed to persist file scan:', e?.message || e);
      }
      cleanup();
      return res.json(json);
    } catch (e) {
      cleanup();
      return res.status(500).json({ error: 'Failed to parse Trivy output' });
    }
  });
};
