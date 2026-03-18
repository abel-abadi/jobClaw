import { useEffect, useState } from 'react';
import { settingsApi } from '../api/client';

const AI_PROVIDERS = [
  { value: 'openai',    label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama',    label: 'Ollama (Local)' },
];

const OPENAI_MODELS    = ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'];
const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'];

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await settingsApi.get();
        setSettings(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key: string, val: string) => setSettings(prev => ({ ...prev, [key]: val }));
  const setKey = (key: string, val: string) => setPendingKeys(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const merged = { ...settings };
      // Only include pending keys if they were actually typed (non-masked)
      for (const [k, v] of Object.entries(pendingKeys)) {
        if (v && !v.includes('...')) merged[k] = v;
      }
      await settingsApi.update(merged);
      showToast('Settings saved ✓', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const provider = settings.ai_provider || 'openai';
  const modelOptions = provider === 'openai' ? OPENAI_MODELS : provider === 'anthropic' ? ANTHROPIC_MODELS : [];

  if (loading) return <div className="loading-spinner"><div className="spinner" /><span>Loading…</span></div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure AI, job sources, and scan schedule</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Settings'}
        </button>
      </div>

      {/* AI Provider */}
      <div className="settings-section">
        <div className="settings-section-title">AI Provider</div>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select className="form-select" value={provider} onChange={e => set('ai_provider', e.target.value)}>
              {AI_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {provider !== 'ollama' && (
            <>
              <div className="form-group">
                <label className="form-label">Model</label>
                {modelOptions.length > 0 ? (
                  <select className="form-select" value={settings.ai_model || ''} onChange={e => set('ai_model', e.target.value)}>
                    {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input className="form-input" value={settings.ai_model || ''} onChange={e => set('ai_model', e.target.value)} placeholder="Model name" />
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key</label>
                <input
                  id={`${provider}-api-key`}
                  className="form-input mono"
                  type="password"
                  value={pendingKeys[`${provider}_api_key`] ?? settings[`${provider}_api_key`] ?? ''}
                  onChange={e => setKey(`${provider}_api_key`, e.target.value)}
                  placeholder={`sk-...`}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Stored locally only. Never transmitted except to {provider === 'openai' ? 'api.openai.com' : 'api.anthropic.com'}.
                </div>
              </div>
            </>
          )}

          {provider === 'ollama' && (
            <>
              <div className="form-group">
                <label className="form-label">Model Name</label>
                <input className="form-input" value={settings.ai_model || ''} onChange={e => set('ai_model', e.target.value)} placeholder="e.g. llama3, mistral, phi3" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ollama Base URL</label>
                <input className="form-input" value={settings.ollama_base_url || 'http://localhost:11434'} onChange={e => set('ollama_base_url', e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Job sources */}
      <div className="settings-section">
        <div className="settings-section-title">Job Sources</div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
            ✅ <strong>Remotive</strong> &amp; <strong>The Muse</strong> are free — no key needed.<br />
            🔑 <strong>Adzuna</strong> requires a free API key (250 req/day).
            <a href="https://developer.adzuna.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: 'var(--accent-primary)' }}>Register →</a>
          </div>
          <div className="form-group">
            <label className="form-label">Adzuna App ID</label>
            <input className="form-input" value={settings.adzuna_app_id || ''} onChange={e => set('adzuna_app_id', e.target.value)} placeholder="Your Adzuna App ID" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Adzuna API Key</label>
            <input
              id="adzuna-api-key"
              className="form-input mono"
              type="password"
              value={pendingKeys.adzuna_api_key ?? settings.adzuna_api_key ?? ''}
              onChange={e => setKey('adzuna_api_key', e.target.value)}
              placeholder="Your Adzuna API Key"
            />
          </div>
        </div>
      </div>

      {/* Scan schedule */}
      <div className="settings-section">
        <div className="settings-section-title">Scan Schedule</div>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Schedule (cron expression)</label>
            <input className="form-input mono" value={settings.scan_schedule || '0 7 * * *'} onChange={e => set('scan_schedule', e.target.value)} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Default: <code style={{ color: 'var(--text-accent)' }}>0 7 * * *</code> = every day at 7AM.{' '}
              <a href="https://crontab.guru" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>crontab.guru →</a>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Minimum Match Score (0–100)</label>
            <div className="row">
              <input
                type="range" min={0} max={100} step={5}
                value={parseInt(settings.match_threshold || '60')}
                onChange={e => set('match_threshold', e.target.value)}
                style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ fontSize: 16, fontWeight: 600, width: 40, textAlign: 'right', color: 'var(--text-accent)' }}>
                {settings.match_threshold || '60'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Jobs scoring below this % are filtered out
            </div>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="settings-section">
        <div className="settings-section-title">System</div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div>📦 <strong>Database:</strong> SQLite at <code className="mono" style={{ color: 'var(--text-accent)', fontSize: 11 }}>backend/data/jobclaw.db</code></div>
            <div>📄 <strong>Resumes:</strong> Stored in <code className="mono" style={{ color: 'var(--text-accent)', fontSize: 11 }}>backend/resumes/</code></div>
            <div>🖨 <strong>PDF Compiler:</strong> tectonic — install with <code className="mono" style={{ color: 'var(--text-accent)', fontSize: 11 }}>brew install tectonic</code></div>
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
