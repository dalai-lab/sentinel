import React, { useState, useEffect } from 'react';
import { ShieldAlert, Key, LogOut, Clock, Server, ShieldCheck, RefreshCw, Wifi } from 'lucide-react';
import { fetchRealLogs } from '../api/signoz';

const SERVER_MAP = {
  'instance-20260630-1713': 'Oracle DB Server',
  'srv1213878': 'Orbithyre',
  'srv1176513': 'Gaplytiq',
  'srv1055295': 'Dalai'
};

function getFriendlyServer(rawService) {
  if (!rawService) return 'Unknown Server';
  const clean = rawService.trim().replace('.log', '');
  return SERVER_MAP[clean] || clean;
}

// Only process real SSH daemon entries, exclude cron sessions
function parseSshEvent(log) {
  const msg = log.msg || '';
  const lowerMsg = msg.toLowerCase();

  // Must be an sshd event
  if (!lowerMsg.includes('sshd')) return null;
  // Exclude cron noise
  if (lowerMsg.includes('cron')) return null;

  let user = null;
  let ip = null;
  let port = null;
  let authMethod = null;
  let action = null;
  let status = null;

  // Accepted publickey / password
  if (lowerMsg.includes('accepted')) {
    const m = msg.match(/Accepted\s+(publickey|password)\s+for\s+(\S+)\s+from\s+([\d.:a-f]+)\s+port\s+(\d+)/i);
    if (m) {
      authMethod = m[1] === 'publickey' ? 'Public Key' : 'Password';
      user = m[2];
      ip = m[3];
      port = m[4];
    } else {
      // fallback partial match
      const mu = msg.match(/for\s+(\S+)\s+from/i);
      const mi = msg.match(/from\s+([\d.:a-f]+)/i);
      if (mu) user = mu[1];
      if (mi) ip = mi[1];
    }
    action = 'Login';
    status = 'success';
  }
  // Failed password / Invalid user
  else if (lowerMsg.includes('failed password') || lowerMsg.includes('invalid user')) {
    const mu = msg.match(/(?:Failed password for(?:\s+invalid user)?|Invalid user)\s+(\S+)/i);
    const mi = msg.match(/from\s+([\d.:a-f]+)/i);
    const mp = msg.match(/port\s+(\d+)/i);
    if (mu) user = mu[1];
    if (mi) ip = mi[1];
    if (mp) port = mp[1];
    action = 'Auth Failed';
    status = 'failed';
  }
  // Disconnected from user X IP port Y
  else if (lowerMsg.includes('disconnected from user')) {
    const m = msg.match(/disconnected from user\s+(\S+)\s+([\d.:a-f]+)\s+port\s+(\d+)/i);
    if (m) { user = m[1]; ip = m[2]; port = m[3]; }
    action = 'Disconnected';
    status = 'disconnected';
  }
  // Connection closed
  else if (lowerMsg.includes('connection closed')) {
    const mi = msg.match(/by\s+([\d.:a-f]+)/i);
    const mp = msg.match(/port\s+(\d+)/i);
    if (mi) ip = mi[1];
    if (mp) port = mp[1];
    action = 'Connection Closed';
    status = 'disconnected';
  }
  else {
    return null; // ignore unrecognized sshd lines
  }

  // Server: from the service name field in the log
  const serverRaw = log.service || '';
  const server = getFriendlyServer(serverRaw);

  return {
    // raw ISO timestamp for accurate sorting
    rawTs: log.rawTs || log.time,
    time: log.time,
    user: user || 'unknown',
    ip: ip || '—',
    port,
    authMethod,
    action,
    status,
    server,
    rawMsg: msg
  };
}

export default function SshLoginsCard() {
  const [sshEvents, setSshEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadSshLogs = async () => {
    try {
      const now = Date.now();
      const past24h = now - 24 * 60 * 60 * 1000;
      const rawLogs = await fetchRealLogs(past24h, now);

      if (!Array.isArray(rawLogs)) return;

      // SigNoz returns newest-first. Parse and keep that order (newest at top).
      const parsed = rawLogs
        .map(log => parseSshEvent(log))
        .filter(Boolean);

      // Deduplicate
      const seen = new Set();
      const unique = [];
      for (const item of parsed) {
        const key = `${item.rawTs}-${item.user}-${item.ip}-${item.status}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      setSshEvents(unique.slice(0, 20));
      setLastRefresh(new Date());
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

  const statusConfig = {
    success: {
      label: 'Login',
      bg: 'rgba(16,185,129,0.08)',
      color: 'var(--status-healthy)',
      border: 'rgba(16,185,129,0.2)',
      rowBorder: 'rgba(16,185,129,0.1)',
      icon: <Key size={15} color="var(--status-healthy)" />
    },
    failed: {
      label: 'Auth Failed',
      bg: 'rgba(239,68,68,0.08)',
      color: 'var(--status-danger)',
      border: 'rgba(239,68,68,0.2)',
      rowBorder: 'rgba(239,68,68,0.1)',
      icon: <ShieldAlert size={15} color="var(--status-danger)" />
    },
    disconnected: {
      label: 'Disconnected',
      bg: 'rgba(255,255,255,0.03)',
      color: 'var(--text-secondary)',
      border: 'var(--border-color)',
      rowBorder: 'var(--border-color)',
      icon: <LogOut size={15} color="var(--text-secondary)" />
    }
  };

  const successCount = sshEvents.filter(e => e.status === 'success').length;
  const failedCount = sshEvents.filter(e => e.status === 'failed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>SSH Access Log</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Real-time SSH session activity across all monitored servers.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastRefresh && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={10} />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            color: 'var(--status-healthy)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600
          }}>
            <Wifi size={10} />
            Live
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      {!loading && sshEvents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Events', value: sshEvents.length, color: 'var(--accent)', bg: 'var(--accent-light)', border: 'rgba(99,102,241,0.2)' },
            { label: 'Logins', value: successCount, color: 'var(--status-healthy)', bg: 'var(--status-healthy-bg)', border: 'rgba(16,185,129,0.2)' },
            { label: 'Auth Failures', value: failedCount, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', border: 'rgba(239,68,68,0.2)' }
          ].map(stat => (
            <div key={stat.label} className="dashboard-card" style={{ padding: '14px 18px', background: stat.bg, border: `1px solid ${stat.border}` }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: stat.color, opacity: 0.8, fontWeight: 600, marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Event List */}
      <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Card Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={14} color="var(--accent)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Events</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>newest first</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '10px', fontSize: '0.85rem' }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Fetching SSH events from SigNoz...
            </div>
          ) : sshEvents.length > 0 ? (
            sshEvents.map((event, idx) => {
              const cfg = statusConfig[event.status] || statusConfig.disconnected;
              const isFirst = idx === 0;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr auto',
                    gap: '14px',
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderBottom: idx < sshEvents.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    borderLeft: `3px solid ${cfg.color}`,
                    transition: 'background 0.15s ease',
                    background: isFirst ? 'rgba(255,255,255,0.012)' : 'transparent'
                  }}
                  className="ssh-event-row"
                >
                  {/* Icon */}
                  <div style={{
                    width: '36px', height: '36px',
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {event.user}
                      </span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
                        background: cfg.bg, color: cfg.color, padding: '2px 7px',
                        borderRadius: '4px', border: `1px solid ${cfg.border}`,
                        textTransform: 'uppercase'
                      }}>
                        {event.action}
                      </span>
                      {isFirst && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(99,102,241,0.2)' }}>
                          LATEST
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Server size={11} color="var(--text-muted)" />
                        <strong style={{ color: 'var(--text-primary)' }}>{event.server}</strong>
                      </span>
                      <span style={{ color: 'var(--border-hover)' }}>·</span>
                      <span className="text-mono" style={{ color: 'var(--text-secondary)' }}>
                        {event.ip}{event.port ? `:${event.port}` : ''}
                      </span>
                      {event.authMethod && (
                        <>
                          <span style={{ color: 'var(--border-hover)' }}>·</span>
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{event.authMethod}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right' }}>
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
              <span style={{ fontWeight: 700, color: 'var(--status-healthy)' }}>No SSH Activity</span>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>No SSH connections in the last 24 hours.</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .ssh-event-row:hover { background: rgba(255,255,255,0.02) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
