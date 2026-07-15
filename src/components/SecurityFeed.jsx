import React, { useState, useEffect } from 'react';
import { ShieldAlert, Flame, ShieldCheck, ChevronDown, ChevronUp, Clock, Info } from 'lucide-react';
import { fetchActiveAlerts } from '../api/signoz';

export default function SecurityFeed() {
  const [realAlerts, setRealAlerts] = useState([]);
  const [groupMode, setGroupMode] = useState('server'); // 'server', 'severity', 'none'
  const [expandedAlerts, setExpandedAlerts] = useState({}); // fingerprint: boolean

  useEffect(() => {
    const pollAlerts = async () => {
      const alerts = await fetchActiveAlerts();
      if (alerts && Array.isArray(alerts)) {
        setRealAlerts(alerts);
      }
    };
    pollAlerts();
    const interval = setInterval(pollAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (fingerprint) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [fingerprint]: !prev[fingerprint]
    }));
  };

  const getAlertSeverity = (alert) => {
    return alert.labels?.severity || 'critical';
  };

  const formatDuration = (activeAt) => {
    if (!activeAt) return 'Active';
    const activeDate = new Date(activeAt);
    const diffMs = Date.now() - activeDate.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Active';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
    return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h ago`;
  };

  // Grouping functions
  const groupAlerts = () => {
    if (groupMode === 'none') {
      return { 'All Alerts': realAlerts };
    }

    const groups = {};
    realAlerts.forEach(alert => {
      let key = 'Unassigned';
      if (groupMode === 'server') {
        key = alert.labels?.host_name || 'All Systems';
      } else if (groupMode === 'severity') {
        key = getAlertSeverity(alert).toUpperCase();
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(alert);
    });

    return groups;
  };

  const grouped = groupAlerts();

  return (
    <div className="dashboard-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: realAlerts.length > 0 ? 'var(--status-danger-bg)' : 'var(--status-healthy-bg)',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${realAlerts.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`
            }}>
              <ShieldAlert size={18} color={realAlerts.length > 0 ? 'var(--status-danger)' : 'var(--status-healthy)'} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Security Center</h3>
          </div>

          {realAlerts.length > 0 && (
            <span style={{
              fontSize: '0.75rem',
              background: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 700
            }}>
              {realAlerts.length} Firing
            </span>
          )}
        </div>

        {/* Group Selection Bar */}
        {realAlerts.length > 0 && (
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}>
            <button
              onClick={() => setGroupMode('server')}
              style={{
                flex: 1,
                background: groupMode === 'server' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: groupMode === 'server' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: groupMode === 'server' ? 600 : 500,
                transition: 'var(--transition)'
              }}
            >
              By Host
            </button>
            <button
              onClick={() => setGroupMode('severity')}
              style={{
                flex: 1,
                background: groupMode === 'severity' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: groupMode === 'severity' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: groupMode === 'severity' ? 600 : 500,
                transition: 'var(--transition)'
              }}
            >
              By Severity
            </button>
            <button
              onClick={() => setGroupMode('none')}
              style={{
                flex: 1,
                background: groupMode === 'none' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: groupMode === 'none' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: groupMode === 'none' ? 600 : 500,
                transition: 'var(--transition)'
              }}
            >
              Plain
            </button>
          </div>
        )}
      </div>

      {/* Alert Lists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {realAlerts.length > 0 ? (
          Object.keys(grouped).map(groupKey => (
            <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupMode !== 'none' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '6px',
                  marginTop: '4px'
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {groupKey}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {grouped[groupKey].length}
                  </span>
                </div>
              )}

              {grouped[groupKey].map(alert => {
                const fingerprint = alert.fingerprint || alert.activeAt + alert.labels?.alertname;
                const isExpanded = !!expandedAlerts[fingerprint];
                const isCritical = getAlertSeverity(alert).toLowerCase() === 'critical';

                return (
                  <div
                    key={fingerprint}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: isCritical ? 'rgba(239, 68, 68, 0.03)' : 'rgba(245, 158, 11, 0.03)',
                      border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      transition: 'var(--transition)'
                    }}
                  >
                    {/* Collapsed Header */}
                    <div
                      onClick={() => toggleExpand(fingerprint)}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '12px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      className="alert-header-row"
                    >
                      <div style={{
                        padding: '6px',
                        background: isCritical ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)',
                        borderRadius: '6px',
                        flexShrink: 0
                      }}>
                        <Flame size={14} color={isCritical ? 'var(--status-danger)' : 'var(--status-warning)'} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: isCritical ? 'var(--status-danger)' : 'var(--status-warning)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {alert.labels?.alertname}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alert.labels?.host_name || 'System Alert'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          {formatDuration(alert.activeAt)}
                        </span>
                        {isExpanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Expanded Detail Panel (No data loss) */}
                    {isExpanded && (
                      <div style={{
                        padding: '12px',
                        borderTop: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'}`,
                        background: 'rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        {/* Summary & Description Annotations */}
                        {(alert.annotations?.summary || alert.annotations?.description) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {alert.annotations.summary && (
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <Info size={12} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span>{alert.annotations.summary}</span>
                              </div>
                            )}
                            {alert.annotations.description && (
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0, paddingLeft: '18px' }}>
                                {alert.annotations.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Raw Labels (Dynamic Metadata Pills) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alert Metadata</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Object.entries(alert.labels || {}).map(([key, val]) => (
                              <span
                                key={key}
                                style={{
                                  fontSize: '0.7rem',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-color)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                <strong>{key}:</strong> {val}
                              </span>
                            ))}
                            {alert.activeAt && (
                              <span style={{
                                fontSize: '0.7rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-color)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)'
                              }}>
                                <strong>activeAt:</strong> {new Date(alert.activeAt).toLocaleString()}
                              </span>
                            )}
                            {alert.state && (
                              <span style={{
                                fontSize: '0.7rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-color)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)'
                              }}>
                                <strong>state:</strong> {alert.state}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, padding: '32px 0' }}>
            <div style={{ padding: '16px', background: 'var(--status-healthy-bg)', borderRadius: '50%', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <ShieldCheck size={28} color="var(--status-healthy)" />
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--status-healthy)', fontWeight: 600 }}>Secure State</span>
            <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', textAlign: 'center' }}>No active threats detected.</span>
          </div>
        )}
      </div>

      <style>{`
        .alert-header-row:hover {
          background: rgba(255, 255, 255, 0.015);
        }
      `}</style>
    </div>
  );
}
