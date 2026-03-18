import { Router } from 'express';
import { getDb } from '../db/schema.js';

const router = Router();

const ALLOWED_KEYS = [
  'ai_provider', 'ai_model', 'openai_api_key', 'anthropic_api_key',
  'ollama_base_url', 'adzuna_app_id', 'adzuna_api_key',
  'scan_schedule', 'match_threshold',
];

// GET /api/settings — return all settings as object
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));

    // Mask API keys in response
    const masked = { ...settings };
    ['openai_api_key', 'anthropic_api_key', 'adzuna_api_key'].forEach(k => {
      if (masked[k] && masked[k].length > 8) {
        masked[k] = masked[k].slice(0, 4) + '...' + masked[k].slice(-4);
      }
    });

    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings — update one or more settings
router.put('/', (req, res) => {
  try {
    const db = getDb();
    const updates = req.body;

    const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);

    const updateMany = db.transaction((entries) => {
      for (const [key, value] of entries) {
        if (ALLOWED_KEYS.includes(key)) {
          upsert.run(key, String(value));
        }
      }
    });

    updateMany(Object.entries(updates));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/:key — get a single setting (unmasked, for internal use)
router.get('/:key', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    if (!row) return res.status(404).json({ error: 'Setting not found' });
    res.json({ key: req.params.key, value: row.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
