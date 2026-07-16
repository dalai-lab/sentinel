import React from 'react';
import { LayoutDashboard, Server, Activity, Settings, X, Terminal, Key, Shield, LineChart, Map, Network } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, activeTab, onTabChange }) {
  const categories = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Overview', id: 'overview', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Telemetry',
      items: [
        { name: 'Servers', id: 'servers', icon: Server },
        { name: 'Graphs', id: 'graphs', icon: LineChart },
        { name: 'Logs & Traces', id: 'logs', icon: Activity }
      ]
    },
    {
      title: 'Security',
      items: [
        { name: 'Threat Map', id: 'threatmap', icon: Map },
        { name: 'SSH Logins', id: 'ssh', icon: Key },
        { name: 'Antivirus Scans', id: 'scans', icon: Shield }
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Settings', id: 'settings', icon: Settings }
      ]
    }
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
        padding: '24px 16px 20px 16px',
        width: 'var(--sidebar-width)'
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
            padding: '4px',
            zIndex: 10
          }}
          className="mobile-close-btn"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Branding Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', marginBottom: '1.75rem', marginTop: '4px' }}>
          <div style={{
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Terminal size={16} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.06em', margin: 0, color: 'var(--text-primary)' }}>SENTINEL</h2>
          </div>
        </div>

        {/* Categorized Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {categories.map((cat, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0 8px',
                marginBottom: '2px'
              }}>
                {cat.title}
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 500 : 450,
                        padding: '8px 10px',
                        background: isActive ? 'var(--color-rgb-255-255-255-0-04)' : 'transparent',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      className={!isActive ? 'nav-item' : ''}
                    >
                      <Icon size={14} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.8rem' }}>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* Add custom styling for navigation item hover states */}
      <style>{`
        .nav-item:hover {
          color: var(--text-primary) !important;
          background: var(--color-rgb-255-255-255-0-02) !important;
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
