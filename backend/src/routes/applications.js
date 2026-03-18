import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/applications
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;

    let query = `
      SELECT a.*, j.title, j.company, j.location, j.remote, j.url, j.match_score
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
    `;
    const params = [];
    if (status) { query += ' WHERE a.status = ?'; params.push(status); }
    query += ' ORDER BY a.updated_at DESC';

    const applications = db.prepare(query).all(...params);
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const app = db.prepare(`
      SELECT a.*, j.title, j.company, j.location, j.remote, j.url, j.description, j.match_score
      FROM applications a JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications — create application (when user clicks Apply / Save)
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { job_id, status = 'saved', notes = '' } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id required' });

    // Check if already exists
    const existing = db.prepare('SELECT id FROM applications WHERE job_id = ?').get(job_id);
    if (existing) {
      return res.status(409).json({ error: 'Application already exists', id: existing.id });
    }

    const id = uuidv4();
    const applied_at = status === 'applied' ? new Date().toISOString() : null;

    db.prepare(`
      INSERT INTO applications (id, job_id, status, applied_at, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, job_id, status, applied_at, notes);

    // Update job status
    const jobStatus = status === 'applied' ? 'reviewing' : 'saved';
    db.prepare(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(jobStatus, job_id);

    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/applications/:id — update status or notes
router.patch('/:id', (req, res) => {
  try {
    const db = getDb();
    const { status, notes } = req.body;
    const validStatuses = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const newStatus = status ?? existing.status;
    const newNotes = notes ?? existing.notes;
    const applied_at = status === 'applied' && !existing.applied_at
      ? new Date().toISOString()
      : existing.applied_at;

    db.prepare(`
      UPDATE applications SET status = ?, notes = ?, applied_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, newNotes, applied_at, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
