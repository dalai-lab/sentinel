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
    <div className="dashboard-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: activeAlerts.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            padding: '8px', 
            borderRadius: '8px',
            color: activeAlerts.length > 0 ? '#ef4444' : '#10b981',
            boxShadow: activeAlerts.length > 0 ? '0 0 15px rgba(239,68,68,0.3)' : 'none'
          }}>
            {activeAlerts.length > 0 ? <ShieldAlert size={20} className="pulse-alert-icon" /> : <CheckCircle2 size={20} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Sentinel Alert Center</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {activeAlerts.length} Active System Alerts
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="custom-scrollbar">
        {loading && alerts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
            Syncing telemetry...
          </div>
        ) : activeAlerts.length === 0 ? (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.05)', 
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            textAlign: 'center'
          }}>
            <CheckCircle2 size={32} color="#10b981" />
            <div>
              <h4 style={{ margin: 0, color: '#10b981', fontSize: '1rem' }}>All Systems Nominal</h4>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No threshold breaches detected across the fleet.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeAlerts.map(alert => {
              const color = getSeverityColor(alert.severity);
              return (
                <div key={alert.id} style={{
                  background: `linear-gradient(90deg, ${color}10 0%, transparent 100%)`,
                  borderLeft: `4px solid ${color}`,
                  borderTop: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  borderRadius: '0 8px 8px 0',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  animation: alert.severity === 'critical' ? 'alert-flash 2s infinite' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ color: color, marginTop: '2px' }}>
                      {getIcon(alert.type)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{alert.title}</h4>
                        <span style={{ 
                          background: `${color}20`, 
                          color: color, 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.65rem', 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {alert.severity}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                        {alert.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Server size={12} /> {alert.host}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAcknowledge(alert.id)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    Acknowledge
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {historicalAlerts.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historicalAlerts.map(alert => (
                <div key={alert.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {getIcon(alert.type)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{alert.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alert.host} • {new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <CheckCircle2 size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes alert-flash {
          0%, 100% { border-left-color: #ef4444; background: linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%); }
          50% { border-left-color: #fca5a5; background: linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, transparent 100%); }
        }
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
