import fetch from 'node-fetch';

/**
 * Fetch remote jobs from Remotive API (no auth required).
 * Docs: https://remotive.com/api
 */
export async function fetchRemotiveJobs(targetTitles = []) {
  const categories = ['software-dev', 'devops-sysadmin', 'product', 'data'];
  const results = [];

  for (const category of categories) {
    try {
      const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=20`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[remotive] HTTP ${res.status} for category "${category}"`);
        continue;
      }

      const data = await res.json();
      const jobs = (data.jobs || [])
        .filter(j => {
          if (targetTitles.length === 0) return true;
          const titleLower = j.title?.toLowerCase() || '';
          return targetTitles.some(t => titleLower.includes(t.toLowerCase()));
        })
        .map(j => ({
          title: j.title,
          company: j.company_name || 'Unknown',
          location: j.candidate_required_location || 'Remote',
          remote: true,
          description: j.description ? stripHtml(j.description) : '',
          url: j.url,
          source: 'remotive',
          salary_min: null,
          salary_max: null,
        }));

      results.push(...jobs);
      console.log(`[remotive] "${category}" → ${jobs.length} relevant jobs`);
    } catch (err) {
      console.error(`[remotive] Error for category "${category}":`, err.message);
    }
  }

  return results;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
