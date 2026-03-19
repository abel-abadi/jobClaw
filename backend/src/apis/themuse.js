import fetch from 'node-fetch';

/**
 * Fetch jobs from The Muse API (no auth required for basic access).
 * Uses category=Computer+and+IT and filters by title keywords locally.
 * Docs: https://www.themuse.com/developers/api/v2
 */
export async function fetchTheMuseJobs(targetTitles = []) {
  const results = [];

  try {
    // Fetch from tech category, 2 pages = up to 40 jobs
    for (let page = 1; page <= 2; page++) {
      const url = `https://www.themuse.com/api/public/jobs?category=Computer+and+IT&page=${page}&descending=true`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });

      if (!res.ok) {
        console.warn(`[themuse] HTTP ${res.status} page ${page}`);
        break;
      }

      const data = await res.json();
      const pageJobs = (data.results || []);

      // Filter by target titles (word-level) if provided
      const filtered = targetTitles.length > 0
        ? pageJobs.filter(j => {
            const nameLower = (j.name || '').toLowerCase();
            return targetTitles.some(target => {
              const targetWords = target.toLowerCase().split(/\s+/).filter(w => w.length > 3);
              return targetWords.some(w => nameLower.includes(w));
            });
          })
        : pageJobs;

      const mapped = filtered
        .filter(j => j.refs?.landing_page)
        .map(j => {
          const location = j.locations?.[0]?.name || '';
          const isRemote = location.toLowerCase().includes('remote') ||
            (j.name || '').toLowerCase().includes('remote') ||
            !location;
          return {
            title: j.name,
            company: j.company?.name || 'Unknown',
            location,
            remote: isRemote,
            description: j.contents ? stripHtml(j.contents) : '',
            url: j.refs.landing_page,
            source: 'themuse',
            salary_min: null,
            salary_max: null,
          };
        });

      results.push(...mapped);
      console.log(`[themuse] page ${page} → ${mapped.length} relevant jobs`);

      // Stop if last page
      if (pageJobs.length < 20) break;
    }
  } catch (err) {
    console.error('[themuse] Error:', err.message);
  }

  return results;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
