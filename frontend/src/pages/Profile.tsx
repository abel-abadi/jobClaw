import { useEffect, useState, useCallback, useRef } from 'react';
import { profileApi, resumeApi } from '../api/client';
import Editor from '@monaco-editor/react';

interface Profile {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  experience: any[];
  education: any[];
  skills: string[];
  target_titles: string[];
  target_locations: string[];
  remote_preference: string;
  min_salary: number | null;
  excluded_companies: string[];
}

const defaultProfile: Profile = {
  name: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', summary: '',
  experience: [], education: [], skills: [],
  target_titles: [], target_locations: [], excluded_companies: [],
  remote_preference: 'any', min_salary: null,
};

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const addTag = (val: string) => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  };
  return (
    <div className="tag-input-container" onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {tags.map(tag => (
        <span key={tag} className="tag">
          {tag}
          <button className="tag-remove" onClick={() => onChange(tags.filter(t => t !== tag))}>×</button>
        </span>
      ))}
      <input
        className="tag-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
          if (e.key === 'Backspace' && !input) onChange(tags.slice(0, -1));
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
      />
    </div>
  );
}

function ExperienceEditor({ experience, onChange }: { experience: any[]; onChange: (e: any[]) => void }) {
  const add = () => onChange([...experience, { title: '', company: '', start: '', end: '', bullets: [''] }]);
  const update = (i: number, field: string, val: any) => {
    const next = [...experience];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const remove = (i: number) => onChange(experience.filter((_, idx) => idx !== i));
  const addBullet = (i: number) => {
    const next = [...experience];
    next[i].bullets = [...(next[i].bullets || []), ''];
    onChange(next);
  };
  const updateBullet = (i: number, bi: number, val: string) => {
    const next = [...experience];
    next[i].bullets = [...next[i].bullets];
    next[i].bullets[bi] = val;
    onChange(next);
  };
  const removeBullet = (i: number, bi: number) => {
    const next = [...experience];
    next[i].bullets = next[i].bullets.filter((_: any, idx: number) => idx !== bi);
    onChange(next);
  };

  return (
    <div>
      {experience.map((exp, i) => (
        <div key={i} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input className="form-input" placeholder="Job Title" value={exp.title || ''} onChange={e => update(i, 'title', e.target.value)} />
            <input className="form-input" placeholder="Company" value={exp.company || ''} onChange={e => update(i, 'company', e.target.value)} />
            <input className="form-input" placeholder="Start (e.g. Jan 2022)" value={exp.start || ''} onChange={e => update(i, 'start', e.target.value)} />
            <input className="form-input" placeholder="End (or Present)" value={exp.end || ''} onChange={e => update(i, 'end', e.target.value)} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Bullet points (one per line)</div>
          {(exp.bullets || []).map((b: string, bi: number) => (
            <div key={bi} className="row" style={{ marginBottom: 6 }}>
              <input className="form-input" style={{ flex: 1 }} placeholder={`Bullet ${bi + 1}`} value={b} onChange={e => updateBullet(i, bi, e.target.value)} />
              <button className="btn btn-danger btn-sm" onClick={() => removeBullet(i, bi)}>×</button>
            </div>
          ))}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => addBullet(i)}>+ Add Bullet</button>
            <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => remove(i)}>Remove Role</button>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={add}>+ Add Role</button>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseTex, setBaseTex] = useState('');
  const [savingTex, setSavingTex] = useState(false);
  const [uploadingTex, setUploadingTex] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, t] = await Promise.all([profileApi.get(), resumeApi.getBase()]);
        setProfile(p);
        setBaseTex(t.content || '');
      } catch (e: any) {
        showToast(e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (field: keyof Profile, val: any) => setProfile(prev => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.update(profile);
      showToast('Profile saved ✓', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTex = async () => {
    setSavingTex(true);
    try {
      await resumeApi.saveBase(baseTex);
      showToast('Template saved ✓', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSavingTex(false);
    }
  };

  const handleUploadTex = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTex(true);
    try {
      await resumeApi.upload(file);
      const t = await resumeApi.getBase();
      setBaseTex(t.content);
      showToast('Template uploaded ✓', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingTex(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const TABS = ['Identity', 'Experience', 'Skills & Education', 'Preferences', 'LaTeX Template'];

  if (loading) return <div className="loading-spinner"><div className="spinner" /><span>Loading…</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Career Profile</h1>
          <p className="page-subtitle">Your source of truth for all job applications</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Profile'}
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={t} className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{t}</button>
        ))}
      </div>

      {/* Identity */}
      {activeTab === 0 && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input id="profile-name" className="form-input" value={profile.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input id="profile-email" className="form-input" type="email" value={profile.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input id="profile-phone" className="form-input" value={profile.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn</label>
              <input className="form-input" value={profile.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/username" />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub</label>
              <input className="form-input" value={profile.github} onChange={e => set('github', e.target.value)} placeholder="github.com/username" />
            </div>
            <div className="form-group">
              <label className="form-label">Portfolio / Website</label>
              <input className="form-input" value={profile.portfolio} onChange={e => set('portfolio', e.target.value)} placeholder="https://yoursite.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Professional Summary</label>
            <textarea className="form-textarea" rows={4} value={profile.summary} onChange={e => set('summary', e.target.value)} placeholder="Brief summary of your experience and goals…" />
          </div>
        </div>
      )}

      {/* Experience */}
      {activeTab === 1 && (
        <ExperienceEditor experience={profile.experience} onChange={v => set('experience', v)} />
      )}

      {/* Skills & Education */}
      {activeTab === 2 && (
        <div className="col" style={{ gap: 20 }}>
          <div className="card">
            <div className="section-title">Skills</div>
            <TagInput
              tags={profile.skills}
              onChange={v => set('skills', v)}
              placeholder="Type a skill and press Enter (e.g. React, Python, SQL)"
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Press Enter or comma to add</div>
          </div>
          <div className="card">
            <div className="section-title">Education</div>
            {(profile.education || []).map((edu: any, i: number) => (
              <div key={i} style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="form-input" placeholder="Degree" value={edu.degree || ''} onChange={e => {
                  const n = [...profile.education]; n[i] = { ...n[i], degree: e.target.value }; set('education', n);
                }} />
                <input className="form-input" placeholder="School" value={edu.school || ''} onChange={e => {
                  const n = [...profile.education]; n[i] = { ...n[i], school: e.target.value }; set('education', n);
                }} />
                <input className="form-input" placeholder="Year (e.g. 2018)" value={edu.year || ''} onChange={e => {
                  const n = [...profile.education]; n[i] = { ...n[i], year: e.target.value }; set('education', n);
                }} />
                <button className="btn btn-danger btn-sm" onClick={() => set('education', profile.education.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => set('education', [...profile.education, { degree: '', school: '', year: '' }])}>
              + Add Education
            </button>
          </div>
        </div>
      )}

      {/* Preferences */}
      {activeTab === 3 && (
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Target Job Titles <span style={{ color: 'var(--accent-secondary)' }}>*</span></label>
              <TagInput
                tags={profile.target_titles}
                onChange={v => set('target_titles', v)}
                placeholder="e.g. Senior Software Engineer, Staff Engineer"
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Used for job search — press Enter to add</div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Target Locations</label>
              <TagInput
                tags={profile.target_locations}
                onChange={v => set('target_locations', v)}
                placeholder="e.g. San Francisco, New York, Austin"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Work Setting</label>
              <select className="form-select" value={profile.remote_preference} onChange={e => set('remote_preference', e.target.value)}>
                <option value="any">Any (Remote or Onsite)</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite Only</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Salary (USD/year)</label>
              <input className="form-input" type="number" value={profile.min_salary || ''} onChange={e => set('min_salary', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g. 150000" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Excluded Companies</label>
              <TagInput
                tags={profile.excluded_companies}
                onChange={v => set('excluded_companies', v)}
                placeholder="Companies you don't want to see"
              />
            </div>
          </div>
        </div>
      )}

      {/* LaTeX Template */}
      {activeTab === 4 && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div className="section-title" style={{ marginBottom: 4 }}>Base LaTeX Resume Template</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  This is used as the base for all AI-tailored resumes. Upload your .tex file or paste it in.
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploadingTex}>
                  {uploadingTex ? 'Uploading…' : '📤 Upload .tex'}
                </button>
                <input ref={fileRef} type="file" accept=".tex,.txt" style={{ display: 'none' }} onChange={handleUploadTex} />
                <button className="btn btn-primary btn-sm" onClick={handleSaveTex} disabled={savingTex}>
                  {savingTex ? 'Saving…' : '💾 Save Template'}
                </button>
              </div>
            </div>
          </div>
          <div style={{ height: 'calc(100vh - 340px)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <Editor
              height="100%"
              language="latex"
              theme="vs-dark"
              value={baseTex}
              onChange={v => setBaseTex(v || '')}
              options={{ fontSize: 13, minimap: { enabled: false }, wordWrap: 'on', scrollBeyondLastLine: false }}
            />
          </div>
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
