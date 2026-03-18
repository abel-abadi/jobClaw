import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { jobsApi, resumeApi, appsApi } from '../api/client';

function formatDate(s: string) {
  return s ? new Date(s).toLocaleDateString() : '';
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<any>(null);
  const [resume, setResume] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [texContent, setTexContent] = useState('');
  const [tailoring, setTailoring] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [activePanel, setActivePanel] = useState<'jd' | 'resume'>('jd');

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await jobsApi.get(id);
      setJob(res.job);
      setApplication(res.application);
      if (res.resume) {
        setResume(res.resume);
        setTexContent(res.resume.tex_content || '');
        if (res.resume.status === 'ready') {
          setPdfUrl(`/resumes/${id}/resume.pdf?t=${Date.now()}`);
        }
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Poll for resume status while generating
  useEffect(() => {
    if (!id || !tailoring) return;
    const interval = setInterval(async () => {
      try {
        const res = await jobsApi.get(id);
        const newStatus = res.job?.resume_status;
        if (newStatus === 'ready') {
          setResume(res.resume);
          setTexContent(res.resume?.tex_content || '');
          setPdfUrl(`/resumes/${id}/resume.pdf?t=${Date.now()}`);
          setTailoring(false);
          showToast('Resume tailored ✓', 'success');
          clearInterval(interval);
        } else if (newStatus === 'failed') {
          setTailoring(false);
          showToast('Tailoring failed — check AI settings', 'error');
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [tailoring, id]);

  const handleTailor = async () => {
    if (!id) return;
    setTailoring(true);
    try {
      await resumeApi.tailor(id);
      showToast('Tailoring in progress…', 'info');
    } catch (e: any) {
      showToast(e.message, 'error');
      setTailoring(false);
    }
  };

  const handleSaveTex = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await resumeApi.save(id, texContent);
      showToast('Saved', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCompile = async () => {
    if (!id) return;
    setCompiling(true);
    try {
      await resumeApi.save(id, texContent);
      const res = await resumeApi.compile(id);
      setPdfUrl(res.pdf_url + `?t=${Date.now()}`);
      showToast('PDF compiled ✓', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setCompiling(false);
    }
  };

  const handleApply = async () => {
    if (!id || !job) return;
    setApplying(true);
    try {
      // Copy pre-fill info to clipboard
      const text = `Name: ${''}\nEmail: ${''}\nJob: ${job.title} at ${job.company}`;
      await navigator.clipboard.writeText(text).catch(() => {});

      // Track application
      if (!application) {
        await appsApi.create(id, 'applied');
      } else {
        await appsApi.update(application.id, { status: 'applied' });
      }

      showToast('Marked as Applied ✓  —  Opening job page…', 'success');

      // Open job URL
      if (job.url) {
        setTimeout(() => window.open(job.url, '_blank'), 500);
      }

      await load();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleSaveForLater = async () => {
    if (!id) return;
    try {
      if (!application) {
        await appsApi.create(id, 'saved');
      }
      showToast('Saved to Tracker', 'success');
      await load();
    } catch {
      showToast('Already saved', 'info');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /><span>Loading…</span></div>;
  if (!job) return <div className="empty-state"><div className="empty-state-title">Job not found</div></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <button className="btn btn-ghost btn-sm mb-16" style={{ marginBottom: 8 }} onClick={() => navigate('/')}>
            ← Back
          </button>
          <div style={{ fontSize: 12, color: 'var(--accent-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            {job.company}
          </div>
          <h1 className="page-title" style={{ fontSize: 22 }}>{job.title}</h1>
          <div className="row" style={{ marginTop: 8, gap: 8 }}>
            {job.remote ? <span className="badge badge-remote">🌐 Remote</span> : job.location && <span className="badge badge-source">📍 {job.location}</span>}
            <span className="badge badge-source">{job.source}</span>
            <span className={`badge badge-score-${job.match_score >= 80 ? 'high' : job.match_score >= 60 ? 'mid' : 'low'}`}>⚡ {job.match_score}% match</span>
            {job.salary_min && <span className="badge badge-source">💰 ${(job.salary_min / 1000).toFixed(0)}k–${(job.salary_max / 1000).toFixed(0)}k</span>}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Found {formatDate(job.discovered_at)}</span>
          </div>
        </div>
        {/* Actions */}
        <div className="row">
          <button className="btn btn-success" onClick={handleApply} disabled={applying || application?.status === 'applied'}>
            {application?.status === 'applied' ? '✓ Applied' : applying ? 'Applying…' : '✓ Apply'}
          </button>
          <button className="btn btn-secondary" onClick={handleSaveForLater} disabled={!!application}>
            {application ? '✓ Saved' : '🔖 Save for Later'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={async () => { await jobsApi.setStatus(id!, 'skipped'); navigate('/'); }}>
            Skip
          </button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`btn ${activePanel === 'jd' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setActivePanel('jd')}>
          📄 Job Description
        </button>
        <button className={`btn ${activePanel === 'resume' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setActivePanel('resume')}>
          📝 Resume {resume?.status === 'ready' ? '✓' : ''}
        </button>
      </div>

      {/* Split pane */}
      <div className="split-pane">
        {/* Left: Job Description */}
        <div className="split-panel" style={{ display: activePanel === 'jd' || window.innerWidth > 900 ? 'flex' : 'none' }}>
          <div className="split-panel-header">
            <span className="split-panel-title">Job Description</span>
            {job.url && (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                Open ↗
              </a>
            )}
          </div>
          <div className="split-panel-content">
            <p className="prose">{job.description || 'No description available.'}</p>
          </div>
        </div>

        {/* Right: Resume editor */}
        <div className="split-panel" style={{ display: activePanel === 'resume' || window.innerWidth > 900 ? 'flex' : 'none' }}>
          <div className="split-panel-header">
            <span className="split-panel-title">Tailored Resume</span>
            <div className="row" style={{ gap: 6 }}>
              {!resume && (
                <button className="btn btn-primary btn-sm" onClick={handleTailor} disabled={tailoring}>
                  {tailoring ? '⚙ Tailoring…' : '✨ Tailor with AI'}
                </button>
              )}
              {resume && (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={handleTailor} disabled={tailoring} title="Re-tailor">
                    {tailoring ? '⚙…' : '↺ Re-tailor'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleSaveTex} disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleCompile} disabled={compiling}>
                    {compiling ? '⚙ Compiling…' : '⚡ Compile PDF'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!resume && !tailoring ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-title">No resume yet</div>
                <div className="empty-state-desc">
                  Click "Tailor with AI" to generate a resume tailored to this job.
                  <br />Make sure your profile and base LaTeX template are set up.
                </div>
              </div>
            ) : tailoring && !resume ? (
              <div className="loading-spinner">
                <div className="spinner" />
                <span>AI is tailoring your resume…</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>This takes ~15–30 seconds</span>
              </div>
            ) : (
              <>
                {/* Monaco LaTeX editor */}
                <div style={{ flex: 1, borderBottom: '1px solid var(--border)' }}>
                  <Editor
                    height="100%"
                    language="latex"
                    theme="vs-dark"
                    value={texContent}
                    onChange={v => setTexContent(v || '')}
                    options={{ fontSize: 12, minimap: { enabled: false }, wordWrap: 'on', renderLineHighlight: 'none', scrollBeyondLastLine: false }}
                  />
                </div>

                {/* PDF preview link */}
                {pdfUrl && (
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>PDF:</span>
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                      👁 Preview PDF ↗
                    </a>
                    <a href={pdfUrl} download="resume.pdf" className="btn btn-ghost btn-sm">
                      ⬇ Download
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
