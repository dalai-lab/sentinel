import React from 'react';

export default function Header() {
  return (
    <header className="glass-panel" style={{ height: '72px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h3 style={{ margin: 0, fontWeight: 500 }}>Dashboard</h3>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', display: 'flex', alignItems: 'center', width: '200px' }}>
           <span className="text-muted" style={{ fontSize: '0.85rem' }}>Search metrics...</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(46, 235, 159, 0.1)', border: '1px solid rgba(46, 235, 159, 0.2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-healthy)', boxShadow: '0 0 10px var(--status-healthy)' }} />
          <span style={{ color: 'var(--status-healthy)', fontSize: '0.85rem', fontWeight: 500 }}>All Systems Operational</span>
        </div>
      </div>
    </header>
  );
}
