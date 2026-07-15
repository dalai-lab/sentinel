import React, { useState, useEffect } from 'react';
import { ShieldAlert, Key, LogOut, Clock, Server, ShieldCheck, RefreshCw, Wifi, User, Activity, Building2 } from 'lucide-react';
import { fetchRealLogs, fetchIpInfo } from '../api/signoz';

const SERVER_MAP = {
  'instance-20260630-1713': 'Oracle DB Server',
  'srv1213878': 'Orbithyre',
  'srv1176513': 'Gaplytiq',
  'srv1055295': 'Dalai'
};

// Renders a small flag image instead of emoji, since Windows doesn't support flag emojis natively
function FlagIcon({ countryCode }) {
  if (!countryCode) return null;
  const code = countryCode.toLowerCase();
  return (
    <img 
      src={`https://flagcdn.com/16x12/${code}.png`} 
      width="16" 
      height="12" 
      alt={code} 
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '1.5px', marginTop: '-2px' }} 
    />
  );
}

function getFriendlyServer(rawService) {
  if (!rawService) return 'Unknown Server';
  const clean = rawService.trim().replace('.log', '');
  return SERVER_MAP[clean] || clean;
}

function parseSshEvent(log) {
  const msg = log.msg || '';
  const lowerMsg = msg.toLowerCase();

  if (!lowerMsg.includes('sshd')) return null;
  if (lowerMsg.includes('cron')) return null;

  let user = null, ip = null, port = null, authMethod = null;
  let action = null, status = null;

  if (lowerMsg.includes('accepted')) {
    const m = msg.match(/Accepted\s+(publickey|password)\s+for\s+(\S+)\s+from\s+([\d.:a-f]+)\s+port\s+(\d+)/i);
    if (m) { authMethod = m[1] === 'publickey' ? 'Public Key' : 'Password'; user = m[2]; ip = m[3]; port = m[4]; }
    else {
      const mu = msg.match(/for\s+(\S+)\s+from/i);
      const mi = msg.match(/from\s+([\d.:a-f]+)/i);
      if (mu) user = mu[1]; if (mi) ip = mi[1];
    }
    action = 'Login'; status = 'success';
  } else if (lowerMsg.includes('failed password') || lowerMsg.includes('invalid user')) {
    const mu = msg.match(/(?:Failed password for(?:\s+invalid user)?|Invalid user)\s+(\S+)/i);
    const mi = msg.match(/from\s+([\d.:a-f]+)/i);
    const mp = msg.match(/port\s+(\d+)/i);
    if (mu) user = mu[1]; if (mi) ip = mi[1]; if (mp) port = mp[1];
    action = 'Auth Failed'; status = 'failed';
  } else if (lowerMsg.includes('disconnected from user')) {
    const m = msg.match(/disconnected from user\s+(\S+)\s+([\d.:a-f]+)\s+port\s+(\d+)/i);
    if (m) { user = m[1]; ip = m[2]; port = m[3]; }
    action = 'Disconnected'; status = 'disconnected';
  } else if (lowerMsg.includes('connection closed')) {
    const mi = msg.match(/by\s+([\d.:a-f]+)/i);
    const mp = msg.match(/port\s+(\d+)/i);
    if (mi) ip = mi[1]; if (mp) port = mp[1];
    action = 'Connection Closed'; status = 'disconnected';
  } else {
    return null;
  }

  const server = getFriendlyServer(log.service || '');
  const rawTs = log.rawTs || log.time;
  const localTime = new Date(rawTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    rawTs,
    time: localTime !== 'Invalid Date' ? localTime : log.time,
    user: user || 'unknown',
    ip: ip || '—',
    port,
    authMethod,
    action,
    status,
    server,
    serverRaw: log.service || ''
  };
}

// Compute "currently active" sessions.
// Each SSH connection is uniquely identified by (server, port) — not just IP —
// because a user can have multiple concurrent connections from the same IP.
// Events must be sorted newest-first (by rawTs) before calling this.
function computeActiveSessions(sortedEvents) {
  // Group by (serverRaw + port) — the real unique session identifier
  const sessionState = {};
  for (const e of sortedEvents) {
    const key = `${e.serverRaw}__${e.port || e.ip}`;
    if (!sessionState[key]) {
      sessionState[key] = e; // most recent event for this session slot
    }
  }
  // A session is active if its most recent event was a Login
  return Object.values(sessionState).filter(e => e.status === 'success');
}

export default function SshLoginsCard() {
  const [allEvents, setAllEvents] = useState([]);
  const [ipGeo, setIpGeo] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'logins' | 'failures'

  const loadSshLogs = async () => {
    try {
      const now = Date.now();
      const past24h = now - 24 * 60 * 60 * 1000;
      const rawLogs = await fetchRealLogs(past24h, now);
      if (!Array.isArray(rawLogs)) return;

      const parsed = rawLogs.map(log => parseSshEvent(log)).filter(Boolean);

      // Deduplicate by exact event key only
      const seen = new Set();
      const deduped = [];
      for (const item of parsed) {
        const key = `${item.rawTs}-${item.user}-${item.ip}-${item.status}`;
        if (!seen.has(key)) { seen.add(key); deduped.push(item); }
      }

      // Sort strictly by rawTs descending — SigNoz batches may have minor ordering gaps
      const sorted = deduped.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));

      setAllEvents(sorted);
      setLastRefresh(new Date());

      // Batch-fetch geolocation for all unique non-internal IPs
      const uniqueIps = [...new Set(deduped.map(e => e.ip).filter(ip => ip && ip !== '—'))];
      if (uniqueIps.length > 0) {
        fetchIpInfo(uniqueIps).then(geoMap => setIpGeo(geoMap));
      }
    } catch (err) {
      console.error('Failed to load SSH logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSshLogs();
    const interval = setInterval(loadSshLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = computeActiveSessions(allEvents);
  const filteredEvents = activeTab === 'all' ? allEvents
    : activeTab === 'logins' ? allEvents.filter(e => e.status === 'success')
    : allEvents.filter(e => e.status === 'failed');

  const displayEvents = filteredEvents.slice(0, 30);

  const statusConfig = {
    success: {
      label: 'Login', bg: 'rgba(16,185,129,0.08)', color: 'var(--status-healthy)',
      border: 'rgba(16,185,129,0.2)', leftBorder: 'var(--status-healthy)',
      icon: <Key size={15} color="var(--status-healthy)" />
    },
    failed: {
      label: 'Auth Failed', bg: 'rgba(239,68,68,0.08)', color: 'var(--status-danger)',
      border: 'rgba(239,68,68,0.2)', leftBorder: 'var(--status-danger)',
      icon: <ShieldAlert size={15} color="var(--status-danger)" />
    },
    disconnected: {
      label: 'Disconnected', bg: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',
      border: 'var(--border-color)', leftBorder: 'rgba(255,255,255,0.08)',
      icon: <LogOut size={15} color="var(--text-muted)" />
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>SSH Access Log</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Full audit trail + live session tracking across all servers — last 24 hours.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastRefresh && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={10} /> {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--status-healthy)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
            <Wifi size={10} /> Live
          </div>
        </div>
      </div>

      {/* ── Active Sessions Panel ── */}
      <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} color="var(--status-healthy)" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Active Sessions</span>
          <span style={{ marginLeft: '6px', background: activeSessions.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', color: activeSessions.length > 0 ? 'var(--status-healthy)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${activeSessions.length > 0 ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}` }}>
            {activeSessions.length} online
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '24px 20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Calculating sessions...</div>
        ) : activeSessions.length === 0 ? (
          <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <ShieldCheck size={16} color="var(--status-healthy)" />
            No active SSH sessions detected.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activeSessions.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', borderBottom: i < activeSessions.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', background: 'rgba(16,185,129,0.02)' }}>
                {/* Live dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-healthy)', boxShadow: '0 0 8px var(--status-healthy)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{s.user}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>on</span>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Server size={11} /> {s.server}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="text-mono">{s.ip}{s.port ? `:${s.port}` : ''}</span>
                    {ipGeo[s.ip] && (
                        <>
                          <span style={{ color: 'var(--border-hover)' }}>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FlagIcon countryCode={ipGeo[s.ip].countryCode} />
                            <span>{ipGeo[s.ip].city ? `${ipGeo[s.ip].city}, ` : ''}{ipGeo[s.ip].country}</span>
                          </span>
                          {ipGeo[s.ip].isp && <>
                            <span style={{ color: 'var(--border-hover)' }}>·</span>
                            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><Building2 size={10} />{ipGeo[s.ip].isp}</span>
                          </>}
                        </>
                      )}
                    {s.authMethod && <><span style={{ color: 'var(--border-hover)' }}>·</span><span style={{ fontStyle: 'italic' }}>{s.authMethod}</span></>}
                    <span style={{ color: 'var(--border-hover)' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> since {s.time}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: 'var(--status-healthy)', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0 }}>ACTIVE</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats Row ── */}
      {!loading && allEvents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Events', value: allEvents.length, color: 'var(--accent)', bg: 'var(--accent-light)', border: 'rgba(99,102,241,0.2)' },
            { label: 'Successful Logins', value: allEvents.filter(e => e.status === 'success').length, color: 'var(--status-healthy)', bg: 'var(--status-healthy-bg)', border: 'rgba(16,185,129,0.2)' },
            { label: 'Auth Failures', value: allEvents.filter(e => e.status === 'failed').length, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', border: 'rgba(239,68,68,0.2)' }
          ].map(stat => (
            <div key={stat.label} className="dashboard-card" style={{ padding: '14px 18px', background: stat.bg, border: `1px solid ${stat.border}` }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.73rem', color: stat.color, opacity: 0.8, fontWeight: 600, marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Full Event Audit Log ── */}
      <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Tab Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={13} color="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', marginRight: '10px' }}>Event Audit Trail</span>
          {['all', 'logins', 'failures'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', border: `1px solid ${activeTab === tab ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`, background: activeTab === tab ? 'var(--accent-light)' : 'transparent', color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)', transition: 'var(--transition)' }}>
              {tab === 'all' ? 'All' : tab === 'logins' ? 'Logins' : 'Failures'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>newest first</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '10px', fontSize: '0.85rem' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Fetching SSH events...
            </div>
          ) : displayEvents.length > 0 ? (
            displayEvents.map((event, idx) => {
              const cfg = statusConfig[event.status] || statusConfig.disconnected;
              const isFirst = idx === 0;
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: '14px', alignItems: 'center', padding: '13px 20px', borderBottom: idx < displayEvents.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', borderLeft: `3px solid ${cfg.leftBorder}`, transition: 'background 0.15s', background: isFirst ? 'rgba(255,255,255,0.01)' : 'transparent' }} className="ssh-event-row">
                  <div style={{ width: '36px', height: '36px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {cfg.icon}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{event.user}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: cfg.bg, color: cfg.color, padding: '2px 7px', borderRadius: '4px', border: `1px solid ${cfg.border}` }}>
                        {event.action}
                      </span>
                      {isFirst && activeTab === 'all' && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(99,102,241,0.2)' }}>LATEST</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.77rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Server size={11} color="var(--text-muted)" />
                        <strong style={{ color: 'var(--text-primary)' }}>{event.server}</strong>
                      </span>
                      <span style={{ color: 'var(--border-hover)' }}>·</span>
                      <span className="text-mono">{event.ip}{event.port ? `:${event.port}` : ''}</span>
                      {ipGeo[event.ip] && (
                        <>
                          <span style={{ color: 'var(--border-hover)' }}>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FlagIcon countryCode={ipGeo[event.ip].countryCode} />
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {ipGeo[event.ip].city ? `${ipGeo[event.ip].city}, ` : ''}{ipGeo[event.ip].country}
                            </span>
                          </span>
                          {ipGeo[event.ip].isp && (
                            <>
                              <span style={{ color: 'var(--border-hover)' }}>·</span>
                              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Building2 size={10} />{ipGeo[event.ip].isp}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      {event.authMethod && (
                        <><span style={{ color: 'var(--border-hover)' }}>·</span><span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{event.authMethod}</span></>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Clock size={11} />
                    {event.time}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '16px', background: 'var(--status-healthy-bg)', borderRadius: '50%', border: '1px solid rgba(16,185,129,0.2)' }}>
                <ShieldCheck size={28} color="var(--status-healthy)" />
              </div>
              <span style={{ fontWeight: 700, color: 'var(--status-healthy)' }}>No Events</span>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>No SSH activity in the last 24 hours.</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .ssh-event-row:hover { background: rgba(255,255,255,0.025) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
