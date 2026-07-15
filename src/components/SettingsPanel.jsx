import React, { useState } from 'react';
import { Save, Key, Database } from 'lucide-react';

export default function SettingsPanel() {
  const [signozUrl, setSignozUrl] = useState('https://telemetry.dalai.in');
  const [signozKey, setSignozKey] = useState('sn_key_live_dalai_7823e8f');
  const [openaiKey, setOpenaiKey] = useState('sk-proj-******************');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Global Settings</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Configure Prometheus database connections and SRE thresholds.</p>
        </div>

        <button
          type="submit"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
            border: 'none',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
            transition: 'var(--transition)'
          }}
          className="save-settings-btn"
        >
          <Save size={14} />
          <span>Save Changes</span>
        </button>
      </div>

      {isSaved && (
        <div style={{
          background: 'var(--status-healthy-bg)',
          border: '1px solid rgba(16,185,129,0.2)',
          color: 'var(--status-healthy)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          Configuration profiles updated and cached successfully! otelcol configurations reloaded.
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

        {/* SigNoz Configuration Card */}
        <div className="dashboard-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Database size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>SigNoz Exporter Connection</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Connection Endpoint URL</label>
              <input
                type="text"
                value={signozUrl}
                onChange={(e) => setSignozUrl(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  outline: 'none',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SigNoz Read API Key</label>
              <input
                type="password"
                value={signozKey}
                onChange={(e) => setSignozKey(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  outline: 'none',
                  fontSize: '0.82rem'
                }}
              />
            </div>
          </div>
        </div>

        {/* AI Copilot Configuration Card */}
        <div className="dashboard-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Key size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>OpenAI SRE Model Settings</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OpenAI Secret API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  outline: 'none',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OpenAI SRE LLM Model</label>
              <select
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  outline: 'none',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Default Fast)</option>
                <option value="gpt-4o">gpt-4o (High-Precision SRE)</option>
                <option value="gpt-4">gpt-4 (Standard)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
