import React, { useState } from 'react';
import { Save } from 'lucide-react';
import AlertSettings from './AlertSettings';

export default function SettingsPanel() {

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

      <AlertSettings />

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


    </form>
  );
}
