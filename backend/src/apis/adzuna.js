import { getDb } from '../db/schema.js';
import fetch from 'node-fetch';

/**
 * Fetch jobs from Adzuna API.
 * Docs: https://developer.adzuna.com/docs/search
 */
export async function fetchAdzunaJobs(targetTitles = []) {
  const db = getDb();
  const appId = db.prepare('SELECT value FROM settings WHERE key = ?').get('adzuna_app_id')?.value;
  const apiKey = db.prepare('SELECT value FROM settings WHERE key = ?').get('adzuna_api_key')?.value;

  if (!appId || !apiKey) {
    console.log('[adzuna] No API credentials configured, skipping');
    return [];
  }

  const queries = targetTitles.length > 0 ? targetTitles : ['software engineer'];
  const results = [];

  for (const query of queries.slice(0, 3)) { // limit to 3 queries per scan
    try {
      const url = new URL('https://api.adzuna.com/v1/api/jobs/us/search/1');
      url.searchParams.set('app_id', appId);
      url.searchParams.set('app_key', apiKey);
      url.searchParams.set('what', query);
      url.searchParams.set('results_per_page', '20');
      url.searchParams.set('sort_by', 'date');
      url.searchParams.set('content-type', 'application/json');

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.warn(`[adzuna] HTTP ${res.status} for query "${query}"`);
        continue;
      }

      const data = await res.json();
      const jobs = (data.results || []).map(j => ({
        title: j.title,
        company: j.company?.display_name || 'Unknown',
        location: j.location?.display_name || '',
        remote: j.title?.toLowerCase().includes('remote') || j.description?.toLowerCase().includes('remote work') || false,
        description: j.description,
        url: j.redirect_url,
        source: 'adzuna',
        salary_min: j.salary_min ? Math.round(j.salary_min) : null,
        salary_max: j.salary_max ? Math.round(j.salary_max) : null,
      }));

      results.push(...jobs);
      console.log(`[adzuna] "${query}" → ${jobs.length} jobs`);
    } catch (err) {
      console.error(`[adzuna] Error fetching "${query}":`, err.message);
    }
  }

  return results;
}
