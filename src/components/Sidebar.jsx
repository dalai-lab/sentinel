import React from 'react';
import { LayoutDashboard, Server, Activity, Settings, X, Terminal } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, activeTab, onTabChange }) {
  const navItems = [
    { name: 'Overview', id: 'overview', icon: LayoutDashboard },
    { name: 'Servers', id: 'servers', icon: Server },
    { name: 'Logs & Traces', id: 'logs', icon: Activity },
    { name: 'Settings', id: 'settings', icon: Settings },
  ];

  const handleNavClick = (id) => {
    onTabChange(id);
    if (onClose) onClose(); // close mobile sidebar drawer on navigation selection
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar-aside ${isOpen ? 'open' : ''}`} style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px',
        width: 'var(--sidebar-width)',
        position: 'relative'
      }}>
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}
          className="mobile-close-btn"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem', marginTop: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Terminal size={18} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em' }}>SENTINEL</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  padding: '12px 16px',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                className={!isActive ? 'nav-item' : ''}
              >
                <Icon size={18} color={isActive ? 'var(--accent)' : 'currentColor'} />
                <span style={{ fontSize: '0.9rem' }}>{item.name}</span>
              </div>
            );
          })}
        </nav>

        <div style={{
          padding: '16px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          marginTop: 'auto'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Connected to SigNoz</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--status-healthy)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-healthy)', boxShadow: '0 0 8px var(--status-healthy)' }} />
            80.225.241.81
          </div>
        </div>
      </aside>

      {/* Add custom styling for navigation item hover states */}
      <style>{`
        .nav-item:hover {
          color: var(--text-primary) !important;
          background: rgba(255, 255, 255, 0.03) !important;
        }
        @media (min-width: 769px) {
          .mobile-close-btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
