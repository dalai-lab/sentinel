import React from 'react';
import { LayoutDashboard, Server, Activity, Settings, X, Terminal, Key, Shield } from 'lucide-react';

export default function Sidebar({ isOpen, onClose, activeTab, onTabChange }) {
  const categories = [
    {
      title: 'Telemetry',
      items: [
        { name: 'Overview', id: 'overview', icon: LayoutDashboard },
        { name: 'Servers', id: 'servers', icon: Server }
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { name: 'Antivirus Scans', id: 'scans', icon: Shield },
        { name: 'Logs & Traces', id: 'logs', icon: Activity },
        { name: 'SSH Logins', id: 'ssh', icon: Key }
      ]
    },
    {
      title: 'Configuration',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px', marginBottom: '2rem', marginTop: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
          }}>
            <Terminal size={18} color="#fff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.08em', margin: 0 }}>SENTINEL</h2>
          </div>
        </div>

        {/* Categorized Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          {categories.map((cat, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 750,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0 12px',
                marginBottom: '4px'
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
                        gap: '12px',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 500,
                        padding: '10px 12px',
                        background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                        borderRadius: '0 6px 6px 0',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      className={!isActive ? 'nav-item' : ''}
                    >
                      <Icon size={16} color={isActive ? 'var(--accent)' : 'currentColor'} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.86rem' }}>{item.name}</span>
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
          background: rgba(255, 255, 255, 0.02) !important;
          border-left-color: rgba(255, 255, 255, 0.15) !important;
        }
        @media (min-width: 769px) {
          .mobile-close-btn {
            display: none !important;
          }
        }
        .operator-pulse-dot {
          animation: status-glow 2s infinite ease-in-out;
        }
        @keyframes status-glow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </>
  );
}
