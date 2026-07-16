import React, { useState } from 'react';
import { Save } from 'lucide-react';
import AlertSettings from './AlertSettings';
import EmailSettings from './EmailSettings';
import TelegramSettings from './TelegramSettings';

export default function SettingsPanel() {

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', paddingBottom: '30px', animation: 'fadeIn 0.4s ease' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>System</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
          <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Configurations</h2>
        </div>
      </div>

      <AlertSettings />
      <EmailSettings />
      <TelegramSettings />

      {isSaved && (
        <div style={{
          background: 'var(--color-rgb-16-185-129-0-05)',
          border: '1px solid var(--color-rgb-16-185-129-0-2)',
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
