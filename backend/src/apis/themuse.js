import fetch from 'node-fetch';

/**
 * Fetch jobs from The Muse API (no auth required for basic access).
 * Docs: https://www.themuse.com/developers/api/v2
 */
export async function fetchTheMuseJobs(targetTitles = []) {
  const results = [];

  try {
    // The Muse doesn't support keyword search via free tier well,
    // so we fetch recent jobs and filter locally
    const url = 'https://www.themuse.com/api/public/jobs?page=1&descending=true';
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      console.warn(`[themuse] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const jobs = (data.results || [])
      .filter(j => {
        if (targetTitles.length === 0) return true;
        const nameLower = j.name?.toLowerCase() || '';
        return targetTitles.some(t => nameLower.includes(t.toLowerCase()));
      })
      .map(j => {
        const location = j.locations?.[0]?.name || '';
        const isRemote = location.toLowerCase().includes('remote') ||
          j.name?.toLowerCase().includes('remote');

        // Get first available job URL
        const jobUrl = j.refs?.landing_page || '';

        return {
          title: j.name,
          company: j.company?.name || 'Unknown',
          location,
          remote: isRemote,
          description: j.contents ? stripHtml(j.contents) : '',
          url: jobUrl,
          source: 'themuse',
          salary_min: null,
          salary_max: null,
        };
      });

    results.push(...jobs);
    console.log(`[themuse] → ${jobs.length} relevant jobs`);
  } catch (err) {
    console.error('[themuse] Error:', err.message);
  }

  return results;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
