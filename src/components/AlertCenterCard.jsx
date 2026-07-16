import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Cpu, HardDrive, Server, Shield, CheckCircle2, Clock, Search, RefreshCw, XCircle } from 'lucide-react';
import { fetchAlerts, acknowledgeAlert } from '../api/alerts';

export default function AlertCenterCard({ globalSearch = '' }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const int = setInterval(loadData, 15000);
    return () => clearInterval(int);
  }, []);

  const handleAcknowledge = async (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
    try {
      await acknowledgeAlert(id);
    } catch (e) {
      loadData();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'cpu': return <Cpu size={16} />;
      case 'ram': return <Server size={16} />;
      case 'disk': return <HardDrive size={16} />;
      case 'antivirus': return <Shield size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getSeverityColor = (severity) => {
    return severity === 'critical' ? 'var(--status-danger)' : 'var(--status-warning)';
  };

  const filteredAlerts = alerts.filter(alert => {
    if (!globalSearch) return true;
    const term = globalSearch.toLowerCase();
    return (
      alert.title?.toLowerCase().includes(term) ||
      alert.message?.toLowerCase().includes(term) ||
      alert.host?.toLowerCase().includes(term) ||
      alert.severity?.toLowerCase().includes(term) ||
      alert.type?.toLowerCase().includes(term)
    );
  });

  const activeAlerts = filteredAlerts.filter(a => a.status === 'active');
  const resolvedAlerts = filteredAlerts.filter(a => a.status !== 'active');

  const totalActive = alerts.filter(a => a.status === 'active').length;
  const totalResolved = alerts.filter(a => a.status !== 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', paddingBottom: '20px', animation: 'fadeIn 0.4s ease' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Infrastructure</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Alert Center</span>
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} color="var(--text-muted)" /> Notifications & Incident Log
          </h2>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            background: 'var(--color-rgb-255-255-255-0-01)',
            border: '1px solid var(--color-rgb-255-255-255-0-02)',
            color: 'var(--text-primary)', padding: '5px 12px',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontWeight: 500, opacity: loading ? 0.6 : 1,
            fontSize: '0.72rem', transition: 'var(--transition)'
          }}
          className="command-copy-box"
        >
          <RefreshCw size={11} className={loading ? 'spin' : ''} />
          <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="fleet-stat-tile" style={{ justifyContent: 'center' }}>
          <div className="fleet-stat-header">
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Active Alerts</span>
            <ShieldAlert size={14} color={totalActive > 0 ? "var(--status-danger)" : "var(--text-muted)"} />
          </div>
          <div className="fleet-stat-value" style={{ margin: '4px 0' }}>
            <span className="fleet-stat-value-text" style={{ fontSize: '1.8rem', color: totalActive > 0 ? "var(--status-danger)" : "var(--text-primary)" }}>{totalActive}</span>
          </div>
          <span className="fleet-stat-sub" style={{ fontSize: '0.65rem' }}>requiring attention</span>
        </div>

        <div className="fleet-stat-tile" style={{ justifyContent: 'center' }}>
          <div className="fleet-stat-header">
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Acknowledged / Resolved</span>
            <CheckCircle2 size={14} color="var(--status-healthy)" />
          </div>
          <div className="fleet-stat-value" style={{ margin: '4px 0' }}>
            <span className="fleet-stat-value-text" style={{ fontSize: '1.8rem' }}>{totalResolved}</span>
          </div>
          <span className="fleet-stat-sub" style={{ fontSize: '0.65rem' }}>archived incidents</span>
        </div>
      </div>

      {/* Main Alerts Grid split into Active and Resolved */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px', alignItems: 'start' }} className="alerts-main-grid">
        
        {/* Active Incidents Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Active Incidents ({activeAlerts.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
            {loading && alerts.length === 0 ? (
              [1, 2].map(i => <div key={i} className="shimmer-card" style={{ height: '100px' }} />)
            ) : activeAlerts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px',
                color: 'var(--status-healthy)', fontSize: '0.74rem',
                border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                background: 'var(--color-rgb-16-185-129-0-01)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={24} color="var(--status-healthy)" />
                  <span>All Systems Nominal. No active threshold breaches.</span>
                </div>
              </div>
            ) : (
              activeAlerts.map(alert => {
                const color = getSeverityColor(alert.severity);
                return (
                  <div key={alert.id} style={{
                    background: 'var(--color-rgb-255-255-255-0-005)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', minWidth: 0 }}>
                        <div style={{ color: color, marginTop: '2px', flexShrink: 0 }}>
                          {getIcon(alert.type)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{alert.title}</span>
                            <span style={{
                              background: `${color}15`,
                              color: color,
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '0.58rem',
                              fontWeight: 650,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>{alert.severity}</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{alert.message}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-rgb-255-255-255-0-02)', paddingTop: '10px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Server size={10} /> {alert.host}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} /> {new Date(alert.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        style={{
                          background: 'var(--color-rgb-255-255-255-0-02)',
                          border: '1px solid var(--color-rgb-255-255-255-0-03)',
                          color: 'var(--text-secondary)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.68rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        className="command-copy-box"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Incident History Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Incident Archive / History ({resolvedAlerts.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
            {loading && alerts.length === 0 ? (
              [1, 2].map(i => <div key={i} className="shimmer-card" style={{ height: '80px' }} />)
            ) : resolvedAlerts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px',
                color: 'var(--text-muted)', fontSize: '0.74rem',
                border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)'
              }}>
                No historical incidents logged.
              </div>
            ) : (
              resolvedAlerts.map(alert => (
                <div key={alert.id} style={{
                  background: 'var(--color-rgb-255-255-255-0-002)',
                  border: '1px solid var(--color-rgb-255-255-255-0-015)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  opacity: 0.75
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        {getIcon(alert.type)}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--status-healthy)', background: 'var(--color-rgb-16-185-129-0-08)', border: '1px solid var(--color-rgb-16-185-129-0-15)', padding: '1px 6px', borderRadius: '3px' }}>
                      Cleared
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.68rem', lineHeight: '1.3' }}>
                    {alert.message}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.62rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--color-rgb-255-255-255-0-01)', paddingTop: '6px' }}>
                    <span>Host: {alert.host}</span>
                    <span>Cleared: {new Date(alert.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .alerts-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
