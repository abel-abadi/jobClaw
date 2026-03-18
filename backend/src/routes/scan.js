import { Router } from 'express';
import { runScan } from '../scheduler/scanner.js';
import { getDb } from '../db/schema.js';

const router = Router();

// POST /api/scan/run — manually trigger a job scan
router.post('/run', async (req, res) => {
  try {
    res.json({ success: true, message: 'Scan started in background' });
    // Run after response is sent
    setImmediate(async () => {
      try {
        const result = await runScan();
        console.log(`✅ Manual scan complete: ${result.added} new jobs found`);
      } catch (err) {
        console.error('❌ Scan failed:', err.message);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scan/status — last scan info
router.get('/status', (req, res) => {
  try {
    const { getDb } = require('../db/schema.js');
    const db = getDb();
    const lastJob = db.prepare(`SELECT discovered_at FROM jobs ORDER BY discovered_at DESC LIMIT 1`).get();
    res.json({ last_scan: lastJob?.discovered_at || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
