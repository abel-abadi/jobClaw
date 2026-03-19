import fetch from 'node-fetch';

/**
 * Fetch remote jobs from Remotive API (no auth required).
 * Category-based fetch + local title keyword filtering.
 * Docs: https://remotive.com/api
 */
export async function fetchRemotiveJobs(targetTitles = []) {
  const results = [];
  const seen = new Set();

  // Fetch across multiple tech categories for breadth
  const categories = ['software-dev', 'devops-sysadmin', 'data', 'product', 'backend', 'frontend'];

  for (const category of categories) {
    try {
      const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=20`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        console.warn(`[remotive] HTTP ${res.status} for category "${category}"`);
        continue;
      }

      const data = await res.json();
      let jobs = (data.jobs || []).filter(j => j.url && !seen.has(j.url));

      // Apply title filter if we have target titles (word-level)
      if (targetTitles.length > 0) {
        jobs = jobs.filter(j => {
          const titleLower = (j.title || '').toLowerCase();
          const descLower = (j.description || '').toLowerCase().substring(0, 500);
          return targetTitles.some(target => {
            const words = target.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            // Match if any key word from the target title appears in the job title
            const titleHit = words.some(w => titleLower.includes(w));
            // Or if skills from the description match (lenient fallback for small boards)
            return titleHit;
          });
        });
      }

      const mapped = jobs.map(j => {
        seen.add(j.url);
        return {
          title: j.title,
          company: j.company_name || 'Unknown',
          location: j.candidate_required_location || 'Remote',
          remote: true,
          description: j.description ? stripHtml(j.description) : '',
          url: j.url,
          source: 'remotive',
          salary_min: null,
          salary_max: null,
        };
      });

      if (mapped.length > 0) {
        results.push(...mapped);
        console.log(`[remotive] "${category}" → ${mapped.length} relevant jobs`);
      }
    } catch (err) {
      console.error(`[remotive] Error for category "${category}":`, err.message);
    }
  }

  return results;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
