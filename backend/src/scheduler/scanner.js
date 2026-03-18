import { getDb } from '../db/schema.js';
import { fetchAdzunaJobs } from '../apis/adzuna.js';
import { fetchRemotiveJobs } from '../apis/remotive.js';
import { fetchTheMuseJobs } from '../apis/themuse.js';
import { saveJobs } from '../db/jobStore.js';

/**
 * Main scanner: fetches from all sources and saves scored jobs.
 */
export async function runScan() {
  const db = getDb();
  const profile = db.prepare('SELECT target_titles FROM profile WHERE id = 1').get();
  const targetTitles = JSON.parse(profile?.target_titles || '[]');

  console.log('🔍 Starting job scan...', targetTitles.length > 0 ? `Titles: ${targetTitles.join(', ')}` : '(no titles set, using defaults)');

  const results = await Promise.allSettled([
    fetchAdzunaJobs(targetTitles),
    fetchRemotiveJobs(targetTitles),
    fetchTheMuseJobs(targetTitles),
  ]);

  const allJobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  console.log(`📦 Total raw jobs fetched: ${allJobs.length}`);

  const added = saveJobs(allJobs);
  console.log(`✅ Scan complete: ${added} new jobs saved`);

  return { added, total: allJobs.length };
}
