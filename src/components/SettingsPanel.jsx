import React, { useState } from 'react';
import { Save } from 'lucide-react';
import AlertSettings from './AlertSettings';
import EmailSettings from './EmailSettings';

export default function SettingsPanel() {

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>System Configurations</h2>
          <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Configure telemetry thresholds, email forwarding dispatches, and SRE rules.</p>
        </div>
      </div>

      <AlertSettings />
      <EmailSettings />

      {isSaved && (
        <div style={{
          background: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.2)',
          color: 'var(--status-healthy)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          fontWeight: 600
        }}>
          Configuration profiles updated and cached successfully!
        </div>
      )}
    </div>
  );
}
