import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Cpu, HardDrive, Server, Shield, CheckCircle2, Clock } from 'lucide-react';
import { fetchAlerts, acknowledgeAlert } from '../api/alerts';

export default function AlertCenterWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
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
    const int = setInterval(loadData, 10000); // refresh every 10s
    return () => clearInterval(int);
  }, []);

  const handleAcknowledge = async (id) => {
    // Optimistic update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
    try {
      await acknowledgeAlert(id);
    } catch (e) {
      loadData(); // revert on fail
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const historicalAlerts = alerts.filter(a => a.status !== 'active').slice(0, 5); // show last 5 history

  const getIcon = (type) => {
    switch (type) {
      case 'cpu': return <Cpu size={18} />;
      case 'ram': return <Server size={18} />;
      case 'disk': return <HardDrive size={18} />;
      case 'antivirus': return <Shield size={18} />;
      default: return <AlertTriangle size={18} />;
    }
  };

  const getSeverityColor = (severity) => {
    return severity === 'critical' ? '#ef4444' : '#f59e0b';
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      height: '380px',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            background: activeAlerts.length > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            padding: '6px', 
            borderRadius: '6px',
            color: activeAlerts.length > 0 ? 'var(--status-danger)' : 'var(--status-healthy)'
          }}>
            {activeAlerts.length > 0 ? <ShieldAlert size={14} className="pulse-alert-icon" /> : <CheckCircle2 size={14} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Alert Center</h3>
            <p style={{ margin: '1px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {activeAlerts.length} Active System Alerts
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="custom-scrollbar">
        {loading && alerts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
            Syncing telemetry...
          </div>
        ) : activeAlerts.length === 0 ? (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.02)', 
            border: '1px solid rgba(16, 185, 129, 0.1)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={18} color="var(--status-healthy)" />
            <div>
              <h4 style={{ margin: 0, color: 'var(--status-healthy)', fontSize: '0.78rem', fontWeight: 600 }}>All Systems Nominal</h4>
              <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>No threshold breaches detected.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeAlerts.map(alert => {
              const color = getSeverityColor(alert.severity);
              return (
                <div key={alert.id} style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderLeft: `3px solid ${color}`,
                  borderTop: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  borderRadius: '0 4px 4px 0',
                  padding: '8px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0, marginRight: '8px' }}>
                    <div style={{ color: color, marginTop: '2px', flexShrink: 0 }}>
                      {getIcon(alert.type)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.title}</h4>
                        <span style={{ 
                          background: `${color}15`, 
                          color: color, 
                          padding: '1px 5px', 
                          borderRadius: '3px', 
                          fontSize: '0.58rem', 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {alert.severity}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Server size={10} /> {alert.host}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Clock size={10} /> {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAcknowledge(alert.id)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {historicalAlerts.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Recent History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {historicalAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      {getIcon(alert.type)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.title}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.host} • {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <CheckCircle2 size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .pulse-alert-icon {
          animation: pulse-icon 2s infinite ease-in-out;
        }
        @keyframes pulse-icon {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
