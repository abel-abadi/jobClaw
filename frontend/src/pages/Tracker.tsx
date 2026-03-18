import { useEffect, useState, useCallback } from 'react';
import { appsApi } from '../api/client';
import { useNavigate } from 'react-router-dom';

const COLUMNS = [
  { key: 'saved',        label: 'Saved',        color: 'var(--status-blue)' },
  { key: 'applied',      label: 'Applied',       color: 'var(--text-accent)' },
  { key: 'interviewing', label: 'Interviewing',  color: 'var(--status-yellow)' },
  { key: 'offer',        label: 'Offer',         color: 'var(--status-green)' },
  { key: 'rejected',     label: 'Rejected',      color: 'var(--status-red)' },
];

function formatDate(s: string) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface App {
  id: string;
  job_id: string;
  status: string;
  title: string;
  company: string;
  location: string;
  remote: number;
  applied_at: string;
  notes: string;
  updated_at: string;
}

export default function Tracker() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appsApi.list();
      setApps(res.applications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    await appsApi.update(appId, { status: newStatus });
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    showToast(`Moved to ${newStatus}`, 'success');
  };

  const handleSaveNotes = async (appId: string) => {
    await appsApi.update(appId, { notes: notesText });
    setApps(prev => prev.map(a => a.id === appId ? { ...a, notes: notesText } : a));
    setEditingNotes(null);
    showToast('Notes saved', 'success');
  };

  const grouped = COLUMNS.map(col => ({
    ...col,
    items: apps.filter(a => a.status === col.key),
  }));

  const total = apps.length;
  const applied = apps.filter(a => a.status === 'applied').length;
  const interviewing = apps.filter(a => a.status === 'interviewing').length;
  const offers = apps.filter(a => a.status === 'offer').length;

  if (loading) return <div className="loading-spinner"><div className="spinner" /><span>Loading…</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Application Tracker</h1>
          <p className="page-subtitle">{total} application{total !== 1 ? 's' : ''} tracked</p>
        </div>
      </div>

      <div className="stats-bar" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--text-accent)' }}>{applied}</span>
          <span className="stat-label">Applied</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--status-yellow)' }}>{interviewing}</span>
          <span className="stat-label">Interviews</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--status-green)' }}>{offers}</span>
          <span className="stat-label">Offers</span>
        </div>
      </div>

      {total === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No applications yet</div>
          <div className="empty-state-desc">Review jobs from the Today's Picks page and save or apply to track them here.</div>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/')}>Browse Jobs</button>
        </div>
      ) : (
        <div className="kanban-board">
          {grouped.map(col => (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-col-count">{col.items.length}</span>
              </div>

              {col.items.map(app => (
                <div key={app.id} className="kanban-card">
                  <div className="kanban-card-company">{app.company}</div>
                  <div className="kanban-card-title" onClick={() => navigate(`/jobs/${app.job_id}`)} style={{ cursor: 'pointer' }}>
                    {app.title}
                  </div>

                  <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {app.remote ? <span className="badge badge-remote" style={{ fontSize: 11 }}>Remote</span>
                      : app.location && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {app.location}</span>}
                    {app.applied_at && (
                      <span className="kanban-card-date">Applied {formatDate(app.applied_at)}</span>
                    )}
                  </div>

                  {/* Move to column */}
                  <div style={{ marginBottom: 8 }}>
                    <select
                      className="form-select"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={app.status}
                      onChange={e => handleStatusChange(app.id, e.target.value)}
                    >
                      {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>

                  {/* Notes */}
                  {editingNotes === app.id ? (
                    <div>
                      <textarea
                        className="form-textarea"
                        style={{ fontSize: 12, minHeight: 64 }}
                        value={notesText}
                        onChange={e => setNotesText(e.target.value)}
                        autoFocus
                      />
                      <div className="row" style={{ gap: 6, marginTop: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveNotes(app.id)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingNotes(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => { setEditingNotes(app.id); setNotesText(app.notes || ''); }}
                      style={{ fontSize: 12, color: app.notes ? 'var(--text-secondary)' : 'var(--text-muted)', cursor: 'pointer', padding: '6px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}
                    >
                      {app.notes || '+ Add notes…'}
                    </div>
                  )}
                </div>
              ))}

              {col.items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  Empty
                </div>
              )}
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
