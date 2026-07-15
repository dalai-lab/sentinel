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
  let action = null, status = null, isBotScan = false;

  if (lowerMsg.includes('accepted')) {
    const m = msg.match(/Accepted\s+(publickey|password)\s+for\s+(\S+)\s+from\s+([\d.:a-f]+)\s+port\s+(\d+)/i);
    if (m) { authMethod = m[1] === 'publickey' ? 'Public Key' : 'Password'; user = m[2]; ip = m[3]; port = m[4]; }
    else {
      const mu = msg.match(/for\s+(\S+)\s+from/i);
      const mi = msg.match(/from\s+([\d.:a-f]+)/i);
      if (mu) user = mu[1]; if (mi) ip = mi[1];
    }
    action = 'Login'; status = 'success';
  } else if (lowerMsg.includes('failed password') || (lowerMsg.includes('invalid user') && !lowerMsg.includes('connection closed'))) {
    const mu = msg.match(/(?:Failed password for(?:\s+invalid user)?|Invalid user)\s+(\S+)/i);
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const mp = msg.match(/port\s+(\d+)/i);
    if (mu) user = mu[1]; if (ipMatch) ip = ipMatch[0]; if (mp) port = mp[1];
    action = 'Auth Failed'; status = 'failed';
  } else if (lowerMsg.includes('disconnected from user') || lowerMsg.includes('disconnected from invalid user') || lowerMsg.includes('disconnected from authenticating user')) {
    const mu = msg.match(/user\s+(\S+)/i);
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const mp = msg.match(/port\s+(\d+)/i);
    if (mu) user = mu[1]; if (ipMatch) ip = ipMatch[0]; if (mp) port = mp[1];
    action = 'Disconnected'; status = 'disconnected';
  } else if (lowerMsg.includes('connection closed')) {
    const mu = msg.match(/user\s+(\S+)/i);
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const mp = msg.match(/port\s+(\d+)/i);
    if (mu) user = mu[1]; if (ipMatch) ip = ipMatch[0]; if (mp) port = mp[1];
    
    if (lowerMsg.includes('[preauth]')) {
      action = 'Bot Scan Dropped';
      isBotScan = true;
    } else {
      action = 'Connection Closed';
    }
    status = 'disconnected';
  } else {
    return null;
  }

  const rawHost = log.resources_string?.['host.name'] || log.service || '';
  const server = getFriendlyServer(rawHost);
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
    isBotScan,
    server,
    serverRaw: log.service || ''
  };
}

function parseCrowdSecEvent(log) {
  const msg = log.msg || '';
  const lowerMsg = msg.toLowerCase();

  const isCrowdSec = lowerMsg.includes('crowdsecurity') || lowerMsg.includes('crowdsec') || lowerMsg.includes('cscli');
  if (!isCrowdSec) return null;

  let ip = null;
  let scenario = 'Unknown Scenario';
  let action = 'Security Alert';
  let details = '';
  let isWhitelisted = false;

  if (lowerMsg.includes('performed')) {
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const scenarioMatch = msg.match(/performed\s+'([^']+)'/i);
    const eventsMatch = msg.match(/\((\d+)\s+events\s+over\s+([^)]+)\)/i);

    if (ipMatch) ip = ipMatch[0];
    if (scenarioMatch) scenario = scenarioMatch[1];
    if (eventsMatch) {
      details = `${eventsMatch[1]} events over ${eventsMatch[2]}`;
    }
    action = 'Triggered Alert';
  }
  else if (lowerMsg.includes('alert :')) {
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const scenarioMatch = msg.match(/alert\s+:\s+(\S+)/i);
    if (ipMatch) ip = ipMatch[0];
    if (scenarioMatch) scenario = scenarioMatch[1];
    action = 'IP Banned / Blocked';
  }
  else if (lowerMsg.includes('whitelisted')) {
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const reasonMatch = msg.match(/reason\s+\[([^\]]+)\]/i);
    const nameMatch = msg.match(/name=(\S+)/i);

    if (ipMatch) ip = ipMatch[0];
    if (reasonMatch) details = `Whitelisted: ${reasonMatch[1]}`;
    if (nameMatch) scenario = nameMatch[1];
    action = 'Banned (Whitelisted)';
    isWhitelisted = true;
  } else if (lowerMsg.includes('ban on ip')) {
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const scenarioMatch = msg.match(/(\S+)\s+by\s+ip/i);
    const durationMatch = msg.match(/:\s+([\w\s-]+ban)\s+on/i);

    if (ipMatch) ip = ipMatch[0];
    if (scenarioMatch) scenario = scenarioMatch[1];
    if (durationMatch) {
      details = durationMatch[1].trim();
    } else {
      details = 'IP Banned';
    }
    action = 'IP Banned / Blocked';
  } else {
    const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (ipMatch) ip = ipMatch[0];
    details = msg;
  }

  if (!ip) return null;

  const rawHost = log.resources_string?.['host.name'] || log.service || '';
  const server = getFriendlyServer(rawHost);
  const rawTs = log.rawTs || log.time;
  const localTime = new Date(rawTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    rawTs,
    time: localTime !== 'Invalid Date' ? localTime : log.time,
    ip,
    scenario,
    action,
    details,
    isWhitelisted,
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
  const [crowdSecEvents, setCrowdSecEvents] = useState([]);
  const [ipGeo, setIpGeo] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'logins' | 'failures' | 'security'
  const [searchQuery, setSearchQuery] = useState('');
  const [serverFilter, setServerFilter] = useState('all');

  const loadSshLogs = async () => {
    try {
      const now = Date.now();
      const past24h = now - 24 * 60 * 60 * 1000;
      const rawLogs = await fetchRealLogs(past24h, now);
      if (!Array.isArray(rawLogs)) return;

      const parsedSsh = rawLogs.map(log => parseSshEvent(log)).filter(Boolean);
      const parsedCs = rawLogs.map(log => parseCrowdSecEvent(log)).filter(Boolean);

      // Deduplicate SSH
      const seenSsh = new Set();
      const dedupedSsh = [];
      for (const item of parsedSsh) {
        const key = `${item.rawTs}-${item.user}-${item.ip}-${item.status}`;
        if (!seenSsh.has(key)) { seenSsh.add(key); dedupedSsh.push(item); }
      }

      // Deduplicate CrowdSec
      const seenCs = new Set();
      const dedupedCs = [];
      for (const item of parsedCs) {
        const key = `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`;
        if (!seenCs.has(key)) { seenCs.add(key); dedupedCs.push(item); }
      }

      const sortedSsh = dedupedSsh.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
      const sortedCs = dedupedCs.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));

      setAllEvents(sortedSsh);
      setCrowdSecEvents(sortedCs);
      setLastRefresh(new Date());

      // Batch-fetch geolocation for all unique non-internal IPs
      const allUniqueIps = [...new Set([
        ...dedupedSsh.map(e => e.ip),
        ...dedupedCs.map(e => e.ip)
      ].filter(ip => ip && ip !== '—' && ip !== '127.0.0.1'))];

      if (allUniqueIps.length > 0) {
        fetchIpInfo(allUniqueIps).then(geoMap => setIpGeo(geoMap));
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

  // Dynamic server list for filter
  const serversList = ['all', ...new Set([
    ...allEvents.map(e => e.server),
    ...crowdSecEvents.map(e => e.server)
  ])];

  // Top threat IPs (Failures + Alerts)
  const threatIPs = Object.entries(
    [
      ...allEvents.filter(e => e.status === 'failed'),
      ...crowdSecEvents
    ].reduce((acc, curr) => {
      if (curr.ip && curr.ip !== '—') {
        acc[curr.ip] = (acc[curr.ip] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([ip, count]) => {
      const geo = ipGeo[ip] || {};
      return { ip, count, geo };
    });

  // Filter logs by tab, server, search query
  const filteredEvents = (activeTab === 'all' ? allEvents
    : activeTab === 'logins' ? allEvents.filter(e => e.status === 'success')
    : activeTab === 'failures' ? allEvents.filter(e => e.status === 'failed')
    : crowdSecEvents)
    .filter(e => {
      const matchServer = serverFilter === 'all' || e.server === serverFilter;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchServer;

      const geo = ipGeo[e.ip] || {};
      return matchServer && (
        (e.ip && e.ip.toLowerCase().includes(query)) ||
        (e.user && e.user.toLowerCase().includes(query)) ||
        (e.action && e.action.toLowerCase().includes(query)) ||
        (e.scenario && e.scenario.toLowerCase().includes(query)) ||
        (geo.city && geo.city.toLowerCase().includes(query)) ||
        (geo.country && geo.country.toLowerCase().includes(query)) ||
        (geo.isp && geo.isp.toLowerCase().includes(query))
      );
    });

  const displayEvents = filteredEvents.slice(0, 30);

  const statusConfig = {
    success: {
      label: 'Login Success', bg: 'rgba(16,185,129,0.06)', color: 'var(--status-healthy)',
      border: 'rgba(16,185,129,0.15)', leftBorder: 'var(--status-healthy)',
      icon: <Key size={14} color="var(--status-healthy)" />
    },
    failed: {
      label: 'Auth Failed', bg: 'rgba(239,68,68,0.06)', color: 'var(--status-danger)',
      border: 'rgba(239,68,68,0.15)', leftBorder: 'var(--status-danger)',
      icon: <ShieldAlert size={14} color="var(--status-danger)" />
    },
    disconnected: {
      label: 'Disconnected', bg: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)',
      border: 'var(--border-color)', leftBorder: 'rgba(255,255,255,0.06)',
      icon: <LogOut size={14} color="var(--text-muted)" />
    }
  };

  const securityConfig = {
    'Triggered Alert': {
      label: 'Scenario Fired', bg: 'rgba(245,158,11,0.06)', color: '#f59e0b',
      border: 'rgba(245,158,11,0.15)', leftBorder: '#f59e0b',
      icon: <ShieldAlert size={14} color="#f59e0b" />
    },
    'IP Banned / Blocked': {
      label: 'IP Blocked', bg: 'rgba(239,68,68,0.08)', color: 'var(--status-danger)',
      border: 'rgba(239,68,68,0.2)', leftBorder: 'var(--status-danger)',
      icon: <ShieldAlert size={14} color="var(--status-danger)" />
    },
    'Banned (Whitelisted)': {
      label: 'Bypassed Safe', bg: 'rgba(16,185,129,0.06)', color: 'var(--status-healthy)',
      border: 'rgba(16,185,129,0.15)', leftBorder: 'var(--status-healthy)',
      icon: <ShieldCheck size={14} color="var(--status-healthy)" />
    },
    'Security Alert': {
      label: 'Alert', bg: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)',
      border: 'var(--border-color)', leftBorder: 'rgba(255,255,255,0.06)',
      icon: <ShieldAlert size={14} color="var(--text-muted)" />
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>SSH Access Log</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
            Audit trails, bot detection, and live sessions across all nodes.
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

      {/* ── Active Sessions Rack Grid ── */}
      <div className="dashboard-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Activity size={14} color="var(--status-healthy)" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Active Sessions</span>
          <span style={{ marginLeft: 'auto', background: activeSessions.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', color: activeSessions.length > 0 ? 'var(--status-healthy)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${activeSessions.length > 0 ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}` }}>
            {activeSessions.length} online
          </span>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0' }}>Calculating sessions...</div>
        ) : activeSessions.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0' }}>
            <ShieldCheck size={16} color="var(--status-healthy)" />
            No active SSH connections detected.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
            {activeSessions.map((s, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.user}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="live-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-healthy)' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(16,185,129,0.08)', color: 'var(--status-healthy)', padding: '1px 6px', borderRadius: '4px' }}>LIVE</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Server size={11} color="var(--accent)" />
                  <span>{s.server}</span>
                  <span style={{ color: 'var(--border-hover)' }}>·</span>
                  <span className="text-mono" style={{ fontSize: '0.72rem' }}>port {s.port}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '2px' }}>
                  <div className="text-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.ip}</div>
                  {ipGeo[s.ip] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <FlagIcon countryCode={ipGeo[s.ip].countryCode} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {ipGeo[s.ip].city ? `${ipGeo[s.ip].city}, ` : ''}{ipGeo[s.ip].country}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                  <Clock size={10} /> Connected {s.time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats and threat insight layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* Stats Grid */}
        {!loading && (allEvents.length > 0 || crowdSecEvents.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Total SSH Events', value: allEvents.length, color: 'var(--accent)', bg: 'var(--accent-light)', border: 'rgba(99,102,241,0.1)' },
              { label: 'Successful Logins', value: allEvents.filter(e => e.status === 'success').length, color: 'var(--status-healthy)', bg: 'var(--status-healthy-bg)', border: 'rgba(16,185,129,0.1)' },
              { label: 'Auth Failures', value: allEvents.filter(e => e.status === 'failed').length, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', border: 'rgba(239,68,68,0.1)' },
              { label: 'CrowdSec Alerts', value: crowdSecEvents.length, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.1)' }
            ].map(stat => (
              <div key={stat.label} className="dashboard-card" style={{ padding: '14px 18px', background: stat.bg, border: `1px solid ${stat.border}` }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.73rem', color: stat.color, opacity: 0.9, fontWeight: 600, marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Main Audit Log & Side Insight Block */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }} className="audit-layout-grid">        
        {/* Left Side: Audit Log */}
        <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
          
          {/* Controls Bar (Tabs + Filters) */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Audit Trail</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['all', 'logins', 'failures', 'security'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', border: `1px solid ${activeTab === tab ? 'rgba(99,102,241,0.2)' : 'var(--border-color)'}`, background: activeTab === tab ? 'var(--accent-light)' : 'transparent', color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)', transition: 'var(--transition)' }}>
                    {tab === 'all' ? 'All' : tab === 'logins' ? 'Logins' : tab === 'failures' ? 'Failures' : 'Security Alerts'}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Server Select filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Search IP, User, location or ISP..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '180px', padding: '6px 12px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '0.75rem' }}
              />
              <select 
                value={serverFilter} 
                onChange={e => setServerFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                <option value="all">All Servers</option>
                {serversList.filter(s => s !== 'all').map(srv => (
                  <option key={srv} value={srv}>{srv}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Logs List */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '10px', fontSize: '0.85rem' }}>
                <RefreshCw size={14} className="spin-animation" />
                Fetching events...
              </div>
            ) : displayEvents.length > 0 ? (
              displayEvents.map((event, idx) => {
                const isSecurity = !!event.scenario;
                const isBot = event.action === 'Bot Scan Dropped';

                const cfg = isSecurity 
                  ? (securityConfig[event.action] || securityConfig['Security Alert'])
                  : (statusConfig[event.status] || statusConfig.disconnected);

                const isFirst = idx === 0 && searchQuery === '';
                const glowClass = isFirst 
                  ? (isBot ? 'row-glow-bot' : event.status === 'success' ? 'row-glow-success' : event.status === 'failed' ? 'row-glow-failed' : 'row-glow-neutral')
                  : '';

                return (
                  <div key={idx} style={{ borderBottom: idx < displayEvents.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', borderLeft: `3px solid ${isBot ? '#d97706' : cfg.leftBorder}`, background: isBot ? 'rgba(245,158,11,0.01)' : 'transparent', transition: 'background 0.15s' }} className={`ssh-event-row ${glowClass}`}>
                    
                    {/* Event Icon */}
                    <div style={{ width: '32px', height: '32px', background: isBot ? 'rgba(245,158,11,0.05)' : cfg.bg, border: `1px solid ${isBot ? 'rgba(245,158,11,0.15)' : cfg.border}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} className="ssh-event-icon">
                      {isBot ? '🤖' : cfg.icon}
                    </div>

                    {/* Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.86rem', color: isBot ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {isSecurity ? event.ip : event.user}
                        </span>
                        
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: isBot ? 'rgba(245,158,11,0.08)' : cfg.bg, color: isBot ? '#f59e0b' : cfg.color, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${isBot ? 'rgba(245,158,11,0.15)' : cfg.border}` }}>
                          {isBot ? 'Scan Blocked' : cfg.label}
                        </span>

                        {isSecurity && (
                          <span style={{ fontSize: '0.62rem', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(245,158,11,0.15)' }}>
                            {event.scenario.replace('crowdsecurity/', '')}
                          </span>
                        )}

                        {isFirst && (
                          <span style={{ fontSize: '0.62rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(99,102,241,0.2)' }}>LATEST</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Server size={10} color="var(--text-muted)" />
                          <strong style={{ color: 'var(--text-secondary)' }}>{event.server}</strong>
                        </span>
                        <span style={{ color: 'var(--border-hover)' }}>·</span>
                        
                        <span className="text-mono" style={{ color: isBot ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                          {isSecurity ? event.details : `${event.ip}${event.port ? `:${event.port}` : ''}`}
                        </span>

                        {ipGeo[event.ip] && (
                          <>
                            <span style={{ color: 'var(--border-hover)' }} className="hide-on-mobile">·</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <FlagIcon countryCode={ipGeo[event.ip].countryCode} />
                              <span style={{ color: 'var(--text-muted)' }}>
                                {ipGeo[event.ip].city ? `${ipGeo[event.ip].city}, ` : ''}{ipGeo[event.ip].country}
                              </span>
                            </span>
                            {ipGeo[event.ip].isp && (
                              <>
                                <span style={{ color: 'var(--border-hover)' }} className="hide-on-mobile">·</span>
                                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }} className="hide-on-mobile">
                                  <Building2 size={9} />{ipGeo[event.ip].isp}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      <Clock size={10} />
                      {event.time}
                    </div>

                  </div>
                );
              })
            ) : (
              <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', border: '1px solid var(--border-color)' }}>
                  <ShieldCheck size={28} color="var(--text-muted)" />
                </div>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>No events match filters.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Security Insights & Threat IPs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="threats-sidebar">
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🛡️ Threat intelligence
            </h3>
            
            {threatIPs.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No threats detected in the last 24h.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {threatIPs.map((threat, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="text-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{threat.ip}</span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.1)', color: 'var(--status-danger)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {threat.count} hits
                      </span>
                    </div>
                    {threat.geo.country && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <FlagIcon countryCode={threat.geo.countryCode} />
                        <span>{threat.geo.city || 'Unknown City'}, {threat.geo.country}</span>
                      </div>
                    )}
                    {threat.geo.isp && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Building2 size={8} />
                        <span>{threat.geo.isp}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        /* Glow animations for the latest connection */
        @keyframes border-glow-green {
          0%, 100% {
            box-shadow: inset 0 0 4px rgba(16, 185, 129, 0.05), 0 0 4px rgba(16, 185, 129, 0.05);
            background: rgba(16, 185, 129, 0.01) !important;
          }
          50% {
            box-shadow: inset 0 0 24px rgba(16, 185, 129, 0.35), 0 0 16px rgba(16, 185, 129, 0.25);
            background: rgba(16, 185, 129, 0.08) !important;
          }
        }
        @keyframes border-glow-red {
          0%, 100% {
            box-shadow: inset 0 0 4px rgba(239, 68, 68, 0.05), 0 0 4px rgba(239, 68, 68, 0.05);
            background: rgba(239, 68, 68, 0.01) !important;
          }
          50% {
            box-shadow: inset 0 0 24px rgba(239, 68, 68, 0.35), 0 0 16px rgba(239, 68, 68, 0.25);
            background: rgba(239, 68, 68, 0.08) !important;
          }
        }
        @keyframes border-glow-amber {
          0%, 100% {
            box-shadow: inset 0 0 4px rgba(245, 158, 11, 0.03), 0 0 4px rgba(245, 158, 11, 0.03);
            background: rgba(245, 158, 11, 0.01) !important;
          }
          50% {
            box-shadow: inset 0 0 24px rgba(245, 158, 11, 0.3), 0 0 16px rgba(245, 158, 11, 0.2);
            background: rgba(245, 158, 11, 0.06) !important;
          }
        }
        @keyframes border-glow-indigo {
          0%, 100% {
            box-shadow: inset 0 0 4px rgba(99, 102, 241, 0.03), 0 0 4px rgba(99, 102, 241, 0.03);
            background: rgba(99, 102, 241, 0.01) !important;
          }
          50% {
            box-shadow: inset 0 0 24px rgba(99, 102, 241, 0.3), 0 0 16px rgba(99, 102, 241, 0.2);
            background: rgba(99, 102, 241, 0.06) !important;
          }
        }
        
        .row-glow-success {
          animation: border-glow-green 2.5s infinite ease-in-out;
        }
        .row-glow-failed {
          animation: border-glow-red 2.5s infinite ease-in-out;
        }
        .row-glow-bot {
          animation: border-glow-amber 2.5s infinite ease-in-out;
        }
        .row-glow-neutral {
          animation: border-glow-indigo 2.5s infinite ease-in-out;
        }

        .ssh-event-row {
          display: grid;
          grid-template-columns: 32px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 12px 20px;
        }
        .ssh-event-row:hover { background: rgba(255,255,255,0.015) !important; }
        .spin-animation { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Grid layout adjustments for larger screens */
        @media (min-width: 1024px) {
          .audit-layout-grid {
            grid-template-columns: 3fr 1fr !important;
          }
        }
        
        /* Mobile layout overrides for compactness */
        @media (max-width: 576px) {
          .ssh-event-row {
            grid-template-columns: 1fr auto !important;
            padding: 8px 10px !important;
            gap: 6px !important;
          }
          .ssh-event-icon {
            display: none !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .ssh-event-row span, .ssh-event-row strong {
            font-size: 0.72rem !important;
          }
        }
        
        .live-pulse {
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
      `}</style>
    </div>
  );
}
