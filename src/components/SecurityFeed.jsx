import React, { useState, useEffect } from 'react';
import { ShieldAlert, Flame, ShieldCheck, ChevronDown, ChevronUp, Clock, Info, Server } from 'lucide-react';
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

  // Robust host extractor for alerts
  const getAlertHost = (alert) => {
    if (!alert) return 'System Alert';
    
    // 1. Try common labels
    const labels = alert.labels || {};
    const possibleHost = 
      labels.host_name || 
      labels.host || 
      labels.instance || 
      labels.server || 
      labels.service_name || 
      labels.service;
      
    if (possibleHost && possibleHost !== 'unknown') {
      return possibleHost;
    }

    // 2. Try parsing annotations
    const annotations = alert.annotations || {};
    if (annotations.summary) {
      const onMatch = annotations.summary.match(/on\s+([a-zA-Z0-9_-]+)/i);
      if (onMatch) return onMatch[1];
    }
    if (annotations.description) {
      const forMatch = annotations.description.match(/(?:for|host|server|instance)\s+([a-zA-Z0-9_-]+)/i);
      if (forMatch) return forMatch[1];
    }

    return 'All Systems';
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
      return { 'All Security Alerts': realAlerts };
    }

    const groups = {};
    realAlerts.forEach(alert => {
      let key = 'Unassigned';
      if (groupMode === 'server') {
        key = getAlertHost(alert);
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
    <div className="dashboard-card" style={{ padding: '18px 20px', height: '100%', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: realAlerts.length > 0 ? 'var(--status-danger-bg)' : 'var(--status-healthy-bg)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${realAlerts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`
            }}>
              <ShieldAlert size={15} color={realAlerts.length > 0 ? 'var(--status-danger)' : 'var(--status-healthy)'} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Security Center</h3>
          </div>

          {realAlerts.length > 0 && (
            <span style={{
              fontSize: '0.65rem',
              background: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 800,
              border: '1px solid rgba(239,68,68,0.15)'
            }}>
              {realAlerts.length} Active
            </span>
          )}
        </div>

        {/* Group Selection Bar */}
        {realAlerts.length > 0 && (
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '2px'
          }}>
            {['server', 'severity', 'none'].map((mode) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                style={{
                  flex: 1,
                  background: groupMode === mode ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: groupMode === mode ? '1px solid var(--border-color)' : '1px solid transparent',
                  color: groupMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.7rem',
                  padding: '4px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: groupMode === mode ? 700 : 500,
                  textTransform: 'capitalize',
                  transition: 'var(--transition)'
                }}
              >
                {mode === 'none' ? 'List' : `By ${mode}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alert Lists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        {realAlerts.length > 0 ? (
          Object.keys(grouped).map(groupKey => (
            <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {groupMode !== 'none' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  paddingBottom: '4px',
                  marginTop: '2px'
                }}>
                  <Server size={10} color="var(--text-muted)" />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {groupKey}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0 5px',
                    borderRadius: '3px',
                    border: '1px solid var(--border-color)',
                    fontWeight: 700
                  }}>
                    {grouped[groupKey].length}
                  </span>
                </div>
              )}

              {grouped[groupKey].map(alert => {
                const fingerprint = alert.fingerprint || alert.activeAt + alert.labels?.alertname;
                const isExpanded = !!expandedAlerts[fingerprint];
                const isCritical = getAlertSeverity(alert).toLowerCase() === 'critical';
                const alertHost = getAlertHost(alert);

                return (
                  <div
                    key={fingerprint}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: isCritical ? 'rgba(239, 68, 68, 0.02)' : 'rgba(245, 158, 11, 0.02)',
                      border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'}`,
                      borderLeft: `3px solid ${isCritical ? 'var(--status-danger)' : 'var(--status-warning)'}`,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      transition: 'background 0.15s'
                    }}
                  >
                    {/* Collapsed Header */}
                    <div
                      onClick={() => toggleExpand(fingerprint)}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      className="alert-header-row"
                    >
                      <div style={{
                        padding: '4px',
                        background: isCritical ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}>
                        <Flame size={12} color={isCritical ? 'var(--status-danger)' : 'var(--status-warning)'} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 750,
                            color: isCritical ? 'var(--status-danger)' : 'var(--status-warning)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.01em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {alert.labels?.alertname || 'Security Event'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                          {alertHost}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={9} />
                          {formatDuration(alert.activeAt)}
                        </span>
                        {isExpanded ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Expanded Detail Panel (No data loss) */}
                    {isExpanded && (
                      <div style={{
                        padding: '10px',
                        borderTop: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)'}`,
                        background: 'rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {/* Summary & Description Annotations */}
                        {(alert.annotations?.summary || alert.annotations?.description) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {alert.annotations.summary && (
                              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                <Info size={11} style={{ marginTop: '1.5px', flexShrink: 0, color: 'var(--accent)' }} />
                                <span>{alert.annotations.summary}</span>
                              </div>
                            )}
                            {alert.annotations.description && (
                              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35, margin: 0, paddingLeft: '15px' }}>
                                {alert.annotations.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Filtered Labels (Dynamic Metadata Pills) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Alert Context</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {Object.entries(alert.labels || {})
                              .filter(([k]) => !['alertname', 'ruleType', 'source', 'severity'].includes(k))
                              .map(([key, val]) => (
                                <span
                                  key={key}
                                  style={{
                                    fontSize: '0.68rem',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid var(--border-color)',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  <strong>{key}:</strong> {val}
                                </span>
                              ))}
                            {alert.activeAt && (
                              <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-color)',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                color: 'var(--text-secondary)'
                              }}>
                                <strong>triggered:</strong> {new Date(alert.activeAt).toLocaleString()}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, padding: '24px 0' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <div className="radar-ping" />
              <div className="radar-circle" />
              <div style={{ padding: '12px', background: 'var(--status-healthy-bg)', borderRadius: '50%', border: '1px solid rgba(16, 185, 129, 0.15)', zIndex: 2 }}>
                <ShieldCheck size={22} color="var(--status-healthy)" />
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--status-healthy)', fontWeight: 800 }}>ACTIVE DEFENSE SECURE</span>
            <span className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px', textAlign: 'center' }}>All systems monitored. No active threats detected.</span>
          </div>
        )}
      </div>

      <style>{`
        .alert-header-row:hover {
          background: rgba(255, 255, 255, 0.015);
        }
        
        /* Pulse Radar Animation */
        .radar-ping {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          animation: radar-ping-anim 2s infinite ease-out;
          z-index: 1;
        }
        .radar-circle {
          position: absolute;
          width: 75px;
          height: 75px;
          border-radius: 50%;
          border: 1px dashed rgba(16, 185, 129, 0.2);
          animation: spin 30s linear infinite;
          z-index: 1;
        }
        
        @keyframes radar-ping-anim {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
