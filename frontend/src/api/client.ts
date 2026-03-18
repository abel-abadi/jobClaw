// Typed API client — all backend calls go through here

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Profile ────────────────────────────────────────
export const profileApi = {
  get: () => request<any>('/profile'),
  update: (data: any) => request<any>('/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Jobs ────────────────────────────────────────────
export const jobsApi = {
  list: (params?: { status?: string; resume_status?: string; limit?: number }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<{ jobs: any[]; total: number }>(`/jobs?${qs}`);
  },
  today: () => request<{ jobs: any[] }>('/jobs/today'),
  get: (id: string) => request<{ job: any; resume: any; application: any }>(`/jobs/${id}`),
  setStatus: (id: string, status: string) =>
    request<any>(`/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ── Applications ────────────────────────────────────
export const appsApi = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<{ applications: any[] }>(`/applications${qs}`);
  },
  create: (job_id: string, status = 'saved', notes = '') =>
    request<any>('/applications', { method: 'POST', body: JSON.stringify({ job_id, status, notes }) }),
  update: (id: string, data: { status?: string; notes?: string }) =>
    request<any>(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Resume ──────────────────────────────────────────
export const resumeApi = {
  getBase: () => request<{ content: string }>('/resume/base'),
  saveBase: (content: string) =>
    request<any>('/resume/base', { method: 'PUT', body: JSON.stringify({ content }) }),
  upload: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/resume/base/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  get: (jobId: string) => request<{ resume: any }>(`/resume/${jobId}`),
  save: (jobId: string, content: string) =>
    request<any>(`/resume/${jobId}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  tailor: (jobId: string) =>
    request<any>(`/resume/${jobId}/tailor`, { method: 'POST' }),
  compile: (jobId: string) =>
    request<{ pdf_url: string }>(`/resume/${jobId}/compile`, { method: 'POST' }),
};

// ── Settings ────────────────────────────────────────
export const settingsApi = {
  get: () => request<Record<string, string>>('/settings'),
  update: (data: Record<string, string>) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Scan ────────────────────────────────────────────
export const scanApi = {
  run: () => request<{ success: boolean; message: string }>('/scan/run', { method: 'POST' }),
};
