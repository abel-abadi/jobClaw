import { getDb } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Score a job against the user's profile preferences (0-100).
 * Uses word-level matching so "Software Engineer" matches "Senior Software Engineer".
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

  // Title match (40 points) — word-level matching both ways
  if (targetTitles.length > 0) {
    const titleWords = (job.title || '').toLowerCase().split(/\s+/);
    const titleFull = (job.title || '').toLowerCase();
    const matched = targetTitles.some(target => {
      const targetLower = target.toLowerCase();
      const targetWords = targetLower.split(/\s+/);
      // Job title contains target as substring OR
      // target contains job title as substring OR
      // majority of target words appear in job title
      if (titleFull.includes(targetLower) || targetLower.includes(titleFull)) return true;
      const wordMatchCount = targetWords.filter(w => titleWords.includes(w)).length;
      return wordMatchCount / targetWords.length >= 0.6; // 60% word overlap
    });
    if (matched) score += 40;
    else score += 5; // minimal credit — title mismatch is significant
  } else {
    score += 25; // no title preference, give neutral credit
  }

  // Remote match (20 points)
  if (remotePreference === 'remote' && job.remote) score += 20;
  else if (remotePreference === 'onsite' && !job.remote) score += 20;
  else if (remotePreference === 'any') score += 15;
  else if (job.remote) score += 8;

  // Location match (20 points)
  if (targetLocations.length === 0 || job.remote) {
    score += 20;
  } else {
    const jobLoc = (job.location || '').toLowerCase();
    const locMatch = targetLocations.some(l => jobLoc.includes(l.toLowerCase()));
    if (locMatch) score += 20;
    else score += 5; // partial credit for having a location at all
  }

  // Skills overlap (20 points)
  if (skills.length > 0 && job.description) {
    const descLower = job.description.toLowerCase();
    const matches = skills.filter(s => descLower.includes(s.toLowerCase()));
    score += Math.min(20, Math.round((matches.length / Math.min(skills.length, 10)) * 20));
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
  const threshold = parseInt(db.prepare('SELECT value FROM settings WHERE key = ?').get('match_threshold')?.value || '40');

  let added = 0;

  for (const job of rawJobs) {
    if (!job.title || !job.url) continue; // skip malformed

    // Dedup by URL
    const existing = db.prepare('SELECT id FROM jobs WHERE url = ?').get(job.url);
    if (existing) continue;

    const score = scoreJob(job, profile);
    if (score < threshold) continue;

    db.prepare(`
      INSERT INTO jobs (id, title, company, location, remote, description, url, source, salary_min, salary_max, match_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      job.title,
      job.company || 'Unknown',
      job.location || '',
      job.remote ? 1 : 0,
      job.description?.substring(0, 8000) || '', // cap description length
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
