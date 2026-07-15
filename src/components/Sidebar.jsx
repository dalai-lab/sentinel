import React from 'react';

export default function Sidebar() {
  return (
    <aside className="glass-panel" style={{ width: '260px', margin: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '2.5rem', letterSpacing: '0.05em' }}>SENTINEL</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 500, padding: '10px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', cursor: 'default' }}>Overview</div>
        <div className="text-muted" style={{ padding: '10px 16px', cursor: 'pointer', transition: 'var(--transition)' }} onMouseOver={e => e.target.style.color = 'var(--text-primary)'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>Servers</div>
        <div className="text-muted" style={{ padding: '10px 16px', cursor: 'pointer', transition: 'var(--transition)' }} onMouseOver={e => e.target.style.color = 'var(--text-primary)'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>Logs & Traces</div>
        <div className="text-muted" style={{ padding: '10px 16px', cursor: 'pointer', transition: 'var(--transition)' }} onMouseOver={e => e.target.style.color = 'var(--text-primary)'} onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}>Settings</div>
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Connected to SigNoz</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--status-healthy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-healthy)' }} />
          80.225.241.81
        </div>
      </div>
    </aside>
  );
}
