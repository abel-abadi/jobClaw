import { Router } from 'express';
import { getDb } from '../db/schema.js';

const router = Router();

// GET /api/jobs — list all jobs with optional filters
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { status, resume_status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (resume_status) { query += ' AND resume_status = ?'; params.push(resume_status); }

    query += ' ORDER BY match_score DESC, discovered_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const jobs = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;

    res.json({ jobs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/today — jobs discovered in last 24h
router.get('/today', (req, res) => {
  try {
    const db = getDb();
    const jobs = db.prepare(`
      SELECT * FROM jobs 
      WHERE discovered_at >= datetime('now', '-1 day')
        AND status = 'new'
      ORDER BY match_score DESC, discovered_at DESC
    `).all();
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Include resume if available
    const resume = db.prepare('SELECT * FROM resumes WHERE job_id = ? ORDER BY generated_at DESC LIMIT 1').get(req.params.id);
    const application = db.prepare('SELECT * FROM applications WHERE job_id = ?').get(req.params.id);

    res.json({ job, resume: resume || null, application: application || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/jobs/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const valid = ['new', 'reviewing', 'skipped', 'saved'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    db.prepare(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
