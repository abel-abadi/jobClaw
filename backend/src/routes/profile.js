import { Router } from 'express';
import { getDb } from '../db/schema.js';

const router = Router();

// GET /api/profile
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    // Parse JSON fields
    const parsed = {
      ...profile,
      experience: JSON.parse(profile.experience || '[]'),
      education: JSON.parse(profile.education || '[]'),
      skills: JSON.parse(profile.skills || '[]'),
      target_titles: JSON.parse(profile.target_titles || '[]'),
      target_locations: JSON.parse(profile.target_locations || '[]'),
      excluded_companies: JSON.parse(profile.excluded_companies || '[]'),
    };
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile
router.put('/', (req, res) => {
  try {
    const db = getDb();
    const {
      name, email, phone, linkedin, github, portfolio, summary,
      experience, education, skills, target_titles, target_locations,
      remote_preference, min_salary, excluded_companies,
    } = req.body;

    db.prepare(`
      UPDATE profile SET
        name = ?, email = ?, phone = ?, linkedin = ?, github = ?,
        portfolio = ?, summary = ?, experience = ?, education = ?,
        skills = ?, target_titles = ?, target_locations = ?,
        remote_preference = ?, min_salary = ?, excluded_companies = ?,
        updated_at = datetime('now')
      WHERE id = 1
    `).run(
      name, email, phone, linkedin, github, portfolio, summary,
      JSON.stringify(experience || []),
      JSON.stringify(education || []),
      JSON.stringify(skills || []),
      JSON.stringify(target_titles || []),
      JSON.stringify(target_locations || []),
      remote_preference, min_salary,
      JSON.stringify(excluded_companies || []),
    );

    const updated = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
