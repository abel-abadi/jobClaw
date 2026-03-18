import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi, scanApi, appsApi } from '../api/client';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: number;
  match_score: number;
  resume_status: string;
  status: string;
  source: string;
  discovered_at: string;
  url: string;
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'badge-score-high' : score >= 60 ? 'badge-score-mid' : 'badge-score-low';
  return <span className={`badge ${cls}`}>⚡ {score}%</span>;
}

function ResumeBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ready:      ['✓ Resume', 'resume-badge-ready'],
    pending:    ['⏳ Queued', 'resume-badge-pending'],
    generating: ['⚙ Generating…', 'resume-badge-generating'],
    failed:     ['✗ Failed', 'resume-badge-failed'],
  };
  const [label, cls] = map[status] || ['—', 'badge-source'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [view, setView] = useState<'today' | 'all'>('today');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, applied: 0, interviews: 0 });

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, allRes, appliedRes, interviewRes] = await Promise.all([
        jobsApi.today(),
        jobsApi.list({ limit: 100 }),
        appsApi.list('applied'),
        appsApi.list('interviewing'),
      ]);
      setJobs(todayRes.jobs);
      setAllJobs(allRes.jobs);
      setStats({
        today: todayRes.jobs.length,
        total: allRes.total,
        applied: appliedRes.applications.length,
        interviews: interviewRes.applications.length,
      });
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleScan = async () => {
    setScanning(true);
    showToast('Scan started — new jobs will appear shortly', 'info');
    try {
      await scanApi.run();
      setTimeout(() => { loadJobs(); setScanning(false); }, 3000);
    } catch (e: any) {
      showToast(e.message, 'error');
      setScanning(false);
    }
  };

  const handleSkip = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    await jobsApi.setStatus(jobId, 'skipped');
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleSave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    try {
      await appsApi.create(jobId, 'saved');
      showToast('Saved to tracker', 'success');
    } catch {
      showToast('Already saved', 'info');
    }
  };

  const displayJobs = view === 'today' ? jobs : allJobs.filter(j => j.status === 'new');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {view === 'today' ? "Today's Picks" : 'All Jobs'}
          </h1>
          <p className="page-subtitle">Jobs curated for your profile</p>
        </div>
        <div className="row">
          <button
            className={`btn btn-secondary btn-sm`}
            onClick={() => setView(view === 'today' ? 'all' : 'today')}
          >
            {view === 'today' ? '📋 All Jobs' : '⚡ Today'}
          </button>
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? '⏳ Scanning…' : '🔍 Run Scan'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>{stats.today}</span>
          <span className="stat-label">New Today</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{stats.total}</span>
          <span className="stat-label">Total Found</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--status-blue)' }}>{stats.applied}</span>
          <span className="stat-label">Applied</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--status-yellow)' }}>{stats.interviews}</span>
          <span className="stat-label">Interviews</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
          <span>Loading jobs…</span>
        </div>
      ) : displayJobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🦞</div>
          <div className="empty-state-title">No jobs yet</div>
          <div className="empty-state-desc">
            Set up your profile with target job titles, then hit <strong>Run Scan</strong> to discover jobs.
          </div>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/profile')}>
            Set Up Profile
          </button>
        </div>
      ) : (
        <div className="job-grid">
          {displayJobs.map(job => (
            <div key={job.id} className="job-card" onClick={() => navigate(`/jobs/${job.id}`)}>
              <div className="job-card-company">{job.company}</div>
              <div className="job-card-title">{job.title}</div>
              <div className="job-card-meta">
                <ScoreBadge score={job.match_score} />
                {job.remote ? <span className="badge badge-remote">🌐 Remote</span> : (
                  job.location && <span className="badge badge-source" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'transparent' }}>📍 {job.location}</span>
                )}
                <span className="badge badge-source">{job.source}</span>
                <ResumeBadge status={job.resume_status} />
              </div>
              <div className="job-card-actions">
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}>
                  Review →
                </button>
                <button className="btn btn-secondary btn-sm" onClick={e => handleSave(e, job.id)}>
                  Save
                </button>
                <button className="btn btn-ghost btn-sm" onClick={e => handleSkip(e, job.id)}>
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
