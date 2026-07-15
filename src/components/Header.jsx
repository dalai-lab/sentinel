import React from 'react';
import { Menu, Search, CheckCircle2 } from 'lucide-react';

export default function Header({ onMenuToggle }) {
  return (
    <header className="dashboard-card" style={{
      height: '72px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onMenuToggle}
          style={{
            background: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}
          className="mobile-menu-toggle"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.15rem', tracking: '-0.02em' }}>Dashboard</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Modern Search */}
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '220px'
        }} className="header-search">
          <Search size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Search metrics...</span>
        </div>

        {/* Health status pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: 'var(--status-healthy-bg)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '6px'
        }}>
          <CheckCircle2 size={14} color="var(--status-healthy)" />
          <span style={{ color: 'var(--status-healthy)', fontSize: '0.85rem', fontWeight: 600 }}>All Systems Operational</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: flex !important;
          }
          .header-search {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
