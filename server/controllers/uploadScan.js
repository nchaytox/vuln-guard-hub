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

  execFile('trivy', args, async (error, stdout) => {
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
