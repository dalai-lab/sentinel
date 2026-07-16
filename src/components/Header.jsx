import React from 'react';
import { Menu, Search, CheckCircle2 } from 'lucide-react';

export default function Header({ onMenuToggle, search, onSearchChange }) {
  return (
    <header style={{
      height: '56px',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onMenuToggle}
          style={{
            background: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}
          className="mobile-menu-toggle"
          aria-label="Toggle menu"
        >
          <Menu size={16} />
        </button>

        <h3 style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>Dashboard</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Working Global Search Input */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '240px'
        }} className="header-search">
          <Search size={12} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search servers, ips..."
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>

        {/* Health status pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-healthy)',
            display: 'inline-block'
          }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 500 }}>All systems operational</span>
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
