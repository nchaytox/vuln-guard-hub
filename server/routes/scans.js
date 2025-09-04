import express from 'express';
import { pgListScansByUsername, pgListScans } from '../db-postgres.js';
import auth from '../authMiddleware.js';

const router = express.Router();

// List recent scans for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    const { type, start, end, limit, offset } = req.query || {};
    let fType = undefined;
    if (type && (type === 'repo' || type === 'file')) fType = type;

    const s = start && !isNaN(Date.parse(String(start))) ? String(start) : undefined;
    const e = end && !isNaN(Date.parse(String(end))) ? String(end) : undefined;

    const lim = Math.min(parseInt(String(limit || '20'), 10) || 20, 100);
    const off = parseInt(String(offset || '0'), 10) || 0;

    const items = await pgListScans(username, { type: fType, start: s, end: e, limit: lim, offset: off });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list scans' });
  }
});

// Export CSV for current user with optional filters
router.get('/export', auth, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    const { type, start, end } = req.query || {};
    let fType = undefined;
    if (type && (type === 'repo' || type === 'file')) fType = type;
    const s = start && !isNaN(Date.parse(String(start))) ? String(start) : undefined;
    const e = end && !isNaN(Date.parse(String(end))) ? String(end) : undefined;

    const items = await pgListScans(username, { type: fType, start: s, end: e, limit: 1000, offset: 0 });

    function sevCounts(result) {
      const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      try {
        const arr = Array.isArray(result) ? result : [];
        for (const item of arr) {
          const results = Array.isArray(item?.Results) ? item.Results : [];
          for (const r of results) {
            const vulns = Array.isArray(r?.Vulnerabilities) ? r.Vulnerabilities : [];
            for (const v of vulns) {
              const sev = String(v?.Severity || '').toUpperCase();
              if (sev in counts) counts[sev] += 1;
            }
          }
        }
      } catch {}
      return counts;
    }

    const header = ['id','type','target','created_at','critical','high','medium','low'];
    const rows = [header.join(',')];
    for (const it of items) {
      const c = sevCounts(it.result);
      const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      rows.push([
        it.id,
        esc(it.type),
        esc(it.target),
        new Date(it.created_at).toISOString(),
        c.CRITICAL,
        c.HIGH,
        c.MEDIUM,
        c.LOW,
      ].join(','));
    }

    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scans.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'Failed to export scans' });
  }
});

export default router;
