import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Cpu, HardDrive, Server, Shield, CheckCircle2, Clock, RefreshCw, Eye, CheckCircle } from 'lucide-react';
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
      case 'cpu': return <Cpu size={15} />;
      case 'ram': return <Server size={15} />;
      case 'disk': return <HardDrive size={15} />;
      case 'antivirus': return <Shield size={15} />;
      default: return <AlertTriangle size={15} />;
    }
  };

  const getStatusConfig = (alert) => {
    const status = alert.status;
    const severity = alert.severity;

    if (status === 'resolved') {
      return {
        label: 'Resolved',
        color: 'var(--status-healthy)',
        bg: 'var(--color-rgb-16-185-129-0-08)',
        border: '1px solid var(--color-rgb-16-185-129-0-15)',
        glowing: false
      };
    }
    if (status === 'acknowledged') {
      return {
        label: 'Acknowledged',
        color: '#3b82f6', // Premium Blue
        bg: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        glowing: false
      };
    }

    // Active
    const isCritical = severity === 'critical';
    return {
      label: isCritical ? 'Critical' : 'Warning',
      color: isCritical ? 'var(--status-danger)' : 'var(--status-warning)',
      bg: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
      border: isCritical ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(245, 158, 11, 0.15)',
      glowing: true
    };
  };

  const getHistoryLabel = (alert) => {
    if (alert.type === 'antivirus_scan_completed') {
      if (alert.severity === 'critical') {
        return {
          text: 'Threat Report',
          color: 'var(--status-danger)',
          bg: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.15)'
        };
      }
      return {
        text: 'Report',
        color: '#a78bfa', // Lavender/Indigo
        bg: 'rgba(167, 139, 250, 0.08)',
        border: '1px solid rgba(167, 139, 250, 0.15)'
      };
    }
    return {
      text: 'Resolved',
      color: 'var(--status-healthy)',
      bg: 'var(--color-rgb-16-185-129-0-08)',
      border: '1px solid var(--color-rgb-16-185-129-0-15)'
    };
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

  // Active incidents are ones that are firing ('active') or being handled ('acknowledged')
  const activeIncidents = filteredAlerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
  // Resolved alerts are the historical logs
  const resolvedAlerts = filteredAlerts.filter(a => a.status === 'resolved');

  const totalActive = alerts.filter(a => a.status === 'active').length;
  const totalAck = alerts.filter(a => a.status === 'acknowledged').length;
  const totalResolved = alerts.filter(a => a.status === 'resolved').length;

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
            <ShieldAlert size={16} color="var(--text-muted)" /> Incidents & Alert Management
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="fleet-stat-tile" style={{ justifyContent: 'center', borderLeft: '3px solid var(--status-danger)' }}>
          <div className="fleet-stat-header">
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Firing Alerts</span>
            <ShieldAlert size={14} color="var(--status-danger)" />
          </div>
          <div className="fleet-stat-value" style={{ margin: '4px 0' }}>
            <span className="fleet-stat-value-text" style={{ fontSize: '1.8rem', color: totalActive > 0 ? "var(--status-danger)" : "var(--text-primary)" }}>{totalActive}</span>
          </div>
          <span className="fleet-stat-sub" style={{ fontSize: '0.65rem' }}>unacknowledged breaches</span>
        </div>

        <div className="fleet-stat-tile" style={{ justifyContent: 'center', borderLeft: '3px solid #3b82f6' }}>
          <div className="fleet-stat-header">
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Under Investigation</span>
            <Eye size={14} color="#3b82f6" />
          </div>
          <div className="fleet-stat-value" style={{ margin: '4px 0' }}>
            <span className="fleet-stat-value-text" style={{ fontSize: '1.8rem', color: '#3b82f6' }}>{totalAck}</span>
          </div>
          <span className="fleet-stat-sub" style={{ fontSize: '0.65rem' }}>active acknowledgements</span>
        </div>

        <div className="fleet-stat-tile" style={{ justifyContent: 'center', borderLeft: '3px solid var(--status-healthy)' }}>
          <div className="fleet-stat-header">
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Resolved History</span>
            <CheckCircle2 size={14} color="var(--status-healthy)" />
          </div>
          <div className="fleet-stat-value" style={{ margin: '4px 0' }}>
            <span className="fleet-stat-value-text" style={{ fontSize: '1.8rem', color: 'var(--status-healthy)' }}>{totalResolved}</span>
          </div>
          <span className="fleet-stat-sub" style={{ fontSize: '0.65rem' }}>archived incidents</span>
        </div>
      </div>

      {/* Main Alerts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px', alignItems: 'start' }} className="alerts-main-grid">
        
        {/* Firing & Acknowledged Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Ongoing Incidents ({activeIncidents.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
            {loading && alerts.length === 0 ? (
              [1, 2].map(i => <div key={i} className="shimmer-card" style={{ height: '120px' }} />)
            ) : activeIncidents.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px',
                color: 'var(--status-healthy)', fontSize: '0.74rem',
                border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                background: 'var(--color-rgb-16-185-129-0-01)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={24} color="var(--status-healthy)" />
                  <span>All Systems Nominal. No ongoing incidents.</span>
                </div>
              </div>
            ) : (
              activeIncidents.map(alert => {
                const conf = getStatusConfig(alert);
                return (
                  <div key={alert.id} style={{
                    background: 'var(--color-rgb-255-255-255-0-005)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `3px solid ${conf.color}`,
                    boxShadow: conf.glowing ? `0 0 12px ${conf.color}08` : 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    animation: conf.glowing ? 'pulse-alert-shadow 3s infinite ease-in-out' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', minWidth: 0 }}>
                        <div style={{ color: conf.color, marginTop: '2px', flexShrink: 0 }}>
                          {getIcon(alert.type)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{alert.title}</span>
                            <span style={{
                              background: conf.bg,
                              color: conf.color,
                              border: conf.border,
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '0.58rem',
                              fontWeight: 650,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>{conf.label}</span>
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
                      
                      {alert.status === 'active' && (
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
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Resolved & Events Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Incident Archive / Logs ({resolvedAlerts.length})
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
                No historical alerts or reports logged.
              </div>
            ) : (
              resolvedAlerts.map(alert => {
                const conf = getHistoryLabel(alert);
                return (
                  <div key={alert.id} style={{
                    background: 'var(--color-rgb-255-255-255-0-002)',
                    border: '1px solid var(--color-rgb-255-255-255-0-015)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    opacity: 0.8
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
                      <span style={{
                        fontSize: '0.62rem',
                        color: conf.color,
                        background: conf.bg,
                        border: conf.border,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        fontWeight: 650,
                        letterSpacing: '0.04em'
                      }}>
                        {conf.text}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.68rem', lineHeight: '1.3' }}>
                      {alert.message}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.62rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--color-rgb-255-255-255-0-01)', paddingTop: '6px' }}>
                      <span>Host: {alert.host}</span>
                      {alert.resolvedAt ? (
                        <span>Resolved: {new Date(alert.resolvedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                      ) : (
                        <span>Logged: {new Date(alert.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                );
              })
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
        @keyframes pulse-alert-shadow {
          0%, 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.05); }
          50% { box-shadow: 0 0 18px rgba(239, 68, 68, 0.12); }
        }
      `}</style>
    </div>
  );
}
