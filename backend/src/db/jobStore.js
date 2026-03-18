import { getDb } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Score a job against the user's profile preferences (0-100).
 */
function scoreJob(job, profile) {
  let score = 0;
  const targetTitles = JSON.parse(profile.target_titles || '[]');
  const targetLocations = JSON.parse(profile.target_locations || '[]');
  const excludedCompanies = JSON.parse(profile.excluded_companies || '[]');
  const skills = JSON.parse(profile.skills || '[]');
  const remotePreference = profile.remote_preference || 'any';

  // Hard exclude
  if (excludedCompanies.some(c => job.company?.toLowerCase().includes(c.toLowerCase()))) {
    return 0;
  }

  // Title match (40 points)
  if (targetTitles.length > 0) {
    const titleLower = job.title?.toLowerCase() || '';
    const titleMatch = targetTitles.some(t =>
      titleLower.includes(t.toLowerCase()) || t.toLowerCase().includes(titleLower)
    );
    if (titleMatch) score += 40;
    else score += 10; // partial credit
  } else {
    score += 20; // no preference set, neutral
  }

  // Remote match (20 points)
  if (remotePreference === 'remote' && job.remote) score += 20;
  else if (remotePreference === 'onsite' && !job.remote) score += 20;
  else if (remotePreference === 'any') score += 10;
  else if (job.remote) score += 5; // flexible about remote

  // Location match (20 points)
  if (targetLocations.length === 0 || job.remote) {
    score += 20;
  } else {
    const jobLoc = job.location?.toLowerCase() || '';
    const locMatch = targetLocations.some(l => jobLoc.includes(l.toLowerCase()));
    if (locMatch) score += 20;
  }

  // Skills overlap (20 points)
  if (skills.length > 0 && job.description) {
    const descLower = job.description.toLowerCase();
    const matches = skills.filter(s => descLower.includes(s.toLowerCase()));
    score += Math.min(20, Math.round((matches.length / skills.length) * 20));
  } else {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Save a list of raw job objects to the DB, deduplicating by URL.
 * Returns count of newly added jobs.
 */
export function saveJobs(rawJobs) {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  const threshold = parseInt(db.prepare('SELECT value FROM settings WHERE key = ?').get('match_threshold')?.value || '60');

  let added = 0;

  for (const job of rawJobs) {
    // Dedup by URL
    if (job.url) {
      const existing = db.prepare('SELECT id FROM jobs WHERE url = ?').get(job.url);
      if (existing) continue;
    }

    const score = scoreJob(job, profile);
    if (score < threshold) continue; // below threshold, skip

    db.prepare(`
      INSERT INTO jobs (id, title, company, location, remote, description, url, source, salary_min, salary_max, match_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      job.title,
      job.company,
      job.location,
      job.remote ? 1 : 0,
      job.description,
      job.url,
      job.source,
      job.salary_min || null,
      job.salary_max || null,
      score
    );
    added++;
  }

  return added;
}
