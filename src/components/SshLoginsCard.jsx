import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Key, LogOut, Clock, Server, ShieldCheck, RefreshCw, Wifi, User, Activity, Building2, Globe, UserX, Info, X, AlertTriangle, Bot } from 'lucide-react';
import { fetchRealLogs, fetchIpInfo } from '../api/signoz';

const SERVER_MAP = {
  '80.225.241.81': 'Oracle DB Server',
  '31.97.235.136': 'Orbithyre',
  '168.231.122.248': 'Dalai',
  '72.61.235.141': 'Gaplytiq'
};

const statusConfig = {
  connected: { label: 'Session Active', bg: 'rgba(16,185,129,0.08)', color: 'var(--status-healthy)', border: 'rgba(16,185,129,0.15)', icon: <Wifi size={14} color="var(--status-healthy)" /> },
  failures: { label: 'Auth Failed', bg: 'rgba(239,68,68,0.08)', color: 'var(--status-danger)', border: 'rgba(239,68,68,0.15)', icon: <ShieldAlert size={14} color="var(--status-danger)" /> },
  disconnected: { label: 'Closed', bg: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: 'var(--border-color)', icon: <LogOut size={14} color="var(--text-muted)" /> }
};

const securityConfig = {
  'SSH Bruteforce Blocked': { label: 'Threat Blocked', bg: 'rgba(239,68,68,0.08)', color: 'var(--status-danger)', border: 'rgba(239,68,68,0.15)', icon: <ShieldAlert size={14} color="var(--status-danger)" /> },
  'Bot Scan Dropped': { label: 'Scan Blocked', bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.15)', icon: <Bot size={14} color="#f59e0b" /> },
  'Security Alert': { label: 'Anomaly', bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.15)', icon: <AlertTriangle size={14} color="#f59e0b" /> }
};

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
      sessionState[key] = e;
    }
  }
  return Object.values(sessionState).filter(e => e.status === 'success');
}

export default function SshLoginsCard({ topThreat }) {
  const [allEvents, setAllEvents] = useState([]);
  const [crowdSecEvents, setCrowdSecEvents] = useState([]);
  const [ipGeo, setIpGeo] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchingOlder, setFetchingOlder] = useState(false);
  const [currentStart, setCurrentStart] = useState(Date.now() - 24 * 60 * 60 * 1000);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [serverFilter, setServerFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    setVisibleCount(25);
  }, [activeTab, searchQuery, serverFilter, quickFilter]);

  const loadSshLogs = async () => {
    try {
      const now = Date.now();
      const past24h = now - 24 * 60 * 60 * 1000;
      const rawLogs = await fetchRealLogs(past24h, now);
      if (!Array.isArray(rawLogs)) return;

      const parsedSsh = rawLogs.map(log => parseSshEvent(log)).filter(Boolean);
      const parsedCs = rawLogs.map(log => parseCrowdSecEvent(log)).filter(Boolean);

      const seenSsh = new Set();
      const dedupedSsh = [];
      for (const item of parsedSsh) {
        const key = `${item.rawTs}-${item.user}-${item.ip}-${item.status}`;
        if (!seenSsh.has(key)) { seenSsh.add(key); dedupedSsh.push(item); }
      }

      const seenCs = new Set();
      const dedupedCs = [];
      for (const item of parsedCs) {
        const key = `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`;
        if (!seenCs.has(key)) { seenCs.add(key); dedupedCs.push(item); }
      }

      const sortedSsh = dedupedSsh.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
      const sortedCs = dedupedCs.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));

      setAllEvents(prev => {
        const existingKeys = new Set(prev.map(item => `${item.rawTs}-${item.user}-${item.ip}-${item.status}`));
        const filteredNew = sortedSsh.filter(item => !existingKeys.has(`${item.rawTs}-${item.user}-${item.ip}-${item.status}`));
        return [...filteredNew, ...prev].sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
      });
      
      setCrowdSecEvents(prev => {
        const existingKeys = new Set(prev.map(item => `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`));
        const filteredNew = sortedCs.filter(item => !existingKeys.has(`${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`));
        return [...filteredNew, ...prev].sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
      });
      
      setLastRefresh(new Date());

      const allUniqueIps = [...new Set([
        ...dedupedSsh.map(e => e.ip),
        ...dedupedCs.map(e => e.ip)
      ].filter(ip => ip && ip !== '—' && ip !== '127.0.0.1'))];

      if (allUniqueIps.length > 0) {
        fetchIpInfo(allUniqueIps).then(geoMap => setIpGeo(geoMap));
      }
    } catch (err) {
      console.error('Failed to load SSH SSH logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOlderSshLogs = async () => {
    if (isFetchingRef.current || !hasMoreRef.current || loading) return;
    try {
      isFetchingRef.current = true;
      setFetchingOlder(true);
      const targetStart = currentStart - 7 * 24 * 60 * 60 * 1000; // Go back 7 days to jump over empty pockets
      const rawLogs = await fetchRealLogs(targetStart, currentStart);
      
      if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
        setCurrentStart(targetStart);
        return;
      }

      const parsedSsh = rawLogs.map(log => parseSshEvent(log)).filter(Boolean);
      const parsedCs = rawLogs.map(log => parseCrowdSecEvent(log)).filter(Boolean);

      if (parsedSsh.length === 0 && parsedCs.length === 0) {
        setCurrentStart(targetStart);
        return;
      }

      // Deduplicate against existing events
      const existingSshKeys = new Set(allEvents.map(item => `${item.rawTs}-${item.user}-${item.ip}-${item.status}`));
      const newSsh = [];
      for (const item of parsedSsh) {
        const key = `${item.rawTs}-${item.user}-${item.ip}-${item.status}`;
        if (!existingSshKeys.has(key)) {
          existingSshKeys.add(key);
          newSsh.push(item);
        }
      }

      const existingCsKeys = new Set(crowdSecEvents.map(item => `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`));
      const newCs = [];
      for (const item of parsedCs) {
        const key = `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`;
        if (!existingCsKeys.has(key)) {
          existingCsKeys.add(key);
          newCs.push(item);
        }
      }

      // If no new records are found after filtering, move time window back
      if (newSsh.length === 0 && newCs.length === 0) {
        setCurrentStart(targetStart);
        return;
      }

      const sortedNewSsh = newSsh.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
      const sortedNewCs = newCs.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));

      setAllEvents(prev => [...prev, ...sortedNewSsh]);
      setCrowdSecEvents(prev => [...prev, ...sortedNewCs]);
      setCurrentStart(targetStart);

      const allUniqueIps = [...new Set([
        ...newSsh.map(e => e.ip),
        ...newCs.map(e => e.ip)
      ].filter(ip => ip && ip !== '—' && ip !== '127.0.0.1' && !ipGeo[ip]))];

      if (allUniqueIps.length > 0) {
        const geoMap = await fetchIpInfo(allUniqueIps);
        setIpGeo(prev => ({ ...prev, ...geoMap }));
      }
    } catch (err) {
      console.error('Failed to load older SSH logs:', err);
    } finally {
      isFetchingRef.current = false;
      setFetchingOlder(false);
    }
  };

  const handleSshScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    // Trigger when scrolled near the bottom (less than 15px from bottom)
    if (scrollHeight - scrollTop - clientHeight < 15 && !loading) {
      if (visibleCount < filteredEvents.length) {
        setVisibleCount(prev => prev + 25);
      } else if (!isFetchingRef.current && hasMoreRef.current) {
        loadOlderSshLogs().then(() => {
          setVisibleCount(prev => prev + 25);
        });
      }
    }
  };

  useEffect(() => {
    loadSshLogs();
    const interval = setInterval(loadSshLogs, 15000); // reduced frequency to prevent token usage
    return () => clearInterval(interval);
  }, []);

  const activeSessions = computeActiveSessions(allEvents);
  const serversList = ['all', ...new Set([...allEvents.map(e => e.server), ...crowdSecEvents.map(e => e.server)])];

  const threatIPs = Object.entries(
    [...allEvents.filter(e => e.status === 'failed'), ...crowdSecEvents].reduce((acc, curr) => {
      if (curr.ip && curr.ip !== '—') acc[curr.ip] = (acc[curr.ip] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([ip, count]) => ({ ip, count, geo: ipGeo[ip] || {} }));

  const targetUsernames = Object.entries(
    allEvents.reduce((acc, curr) => {
      if (curr.user && curr.user !== 'unknown') acc[curr.user] = (acc[curr.user] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const geoBreakdown = Object.entries(
    [...allEvents, ...crowdSecEvents].reduce((acc, curr) => {
      if (curr.ip && curr.ip !== '—') {
        const geo = ipGeo[curr.ip] || {};
        const country = geo.country || 'Unknown Location';
        if (!acc[country]) acc[country] = { count: 0, code: geo.countryCode || '' };
        acc[country].count += 1;
      }
      return acc;
    }, {})
  ).sort((a, b) => b[1].count - a[1].count).slice(0, 3);

  const filteredEvents = (activeTab === 'all' ? allEvents
    : activeTab === 'logins' ? allEvents.filter(e => e.status === 'success')
    : activeTab === 'failures' ? allEvents.filter(e => e.status === 'failed')
    : crowdSecEvents)
    .filter(e => {
      const matchServer = serverFilter === 'all' || e.server === serverFilter;
      let matchQuick = true;
      if (quickFilter === 'non-root') matchQuick = e.user && e.user.toLowerCase() !== 'root';
      else if (quickFilter === 'bots') matchQuick = e.isBotScan;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchServer && matchQuick;
      const geo = ipGeo[e.ip] || {};
      return matchServer && matchQuick && (
        (e.ip?.toLowerCase().includes(query)) || (e.user?.toLowerCase().includes(query)) || (e.action?.toLowerCase().includes(query)) ||
        (e.scenario?.toLowerCase().includes(query)) || (geo.city?.toLowerCase().includes(query)) || (geo.country?.toLowerCase().includes(query)) || (geo.isp?.toLowerCase().includes(query))
      );
    });

  const displayEvents = filteredEvents.slice(0, visibleCount);

  const statusConfig = {
    success: { label: 'Login Success', bg: 'rgba(16,185,129,0.06)', color: 'var(--status-healthy)', border: 'rgba(16,185,129,0.15)', icon: <Key size={14} color="var(--status-healthy)" /> },
    failed: { label: 'Auth Failed', bg: 'rgba(239,68,68,0.06)', color: 'var(--status-danger)', border: 'rgba(239,68,68,0.15)', icon: <ShieldAlert size={14} color="var(--status-danger)" /> },
    disconnected: { label: 'Disconnected', bg: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: 'var(--border-color)', icon: <LogOut size={14} color="var(--text-muted)" /> }
  };

  const securityConfig = {
    'Triggered Alert': { label: 'Scenario Fired', bg: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: 'rgba(245,158,11,0.15)', icon: <ShieldAlert size={14} color="#f59e0b" /> },
    'IP Banned / Blocked': { label: 'IP Blocked', bg: 'rgba(239,68,68,0.08)', color: 'var(--status-danger)', border: 'rgba(239,68,68,0.2)', icon: <ShieldAlert size={14} color="var(--status-danger)" /> },
    'Banned (Whitelisted)': { label: 'Bypassed Safe', bg: 'rgba(16,185,129,0.06)', color: 'var(--status-healthy)', border: 'rgba(16,185,129,0.15)', icon: <ShieldCheck size={14} color="var(--status-healthy)" /> },
    'Security Alert': { label: 'Alert', bg: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: 'var(--border-color)', icon: <ShieldAlert size={14} color="var(--text-muted)" /> }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent)" /> SSH Access Log Center
          </h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Audit trails, automated threat signals, and live sessions across all nodes.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastRefresh && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={10} /> {lastRefresh.toLocaleTimeString()}</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--status-healthy)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}><Wifi size={10} /> Live Feed</div>
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Activity size={14} color="var(--status-healthy)" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Current Active Sessions</span>
          <span style={{ marginLeft: 'auto', background: activeSessions.length > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', color: activeSessions.length > 0 ? 'var(--status-healthy)' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${activeSessions.length > 0 ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}` }}>
            {activeSessions.length} active connection{activeSessions.length === 1 ? '' : 's'}
          </span>
        </div>
        {loading ? <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0' }}>Analyzing sessions...</div>
          : activeSessions.length === 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0' }}><ShieldCheck size={16} color="var(--status-healthy)" /> No active SSH sessions connected.</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
            {activeSessions.map((s, i) => (
              <div key={i} onClick={() => setSelectedEvent(s)} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.user}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="live-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-healthy)' }} /><span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(16,185,129,0.08)', color: 'var(--status-healthy)', padding: '1px 6px', borderRadius: '4px' }}>LIVE</span></div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Server size={11} color="var(--accent)" /> <span>{s.server}</span><span style={{ color: 'var(--border-hover)' }}>·</span><span className="text-mono" style={{ fontSize: '0.72rem' }}>port {s.port}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}><div className="text-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.ip}</div>{ipGeo[s.ip] && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}><FlagIcon countryCode={ipGeo[s.ip].countryCode} /> <span>{ipGeo[s.ip].city ? `${ipGeo[s.ip].city}, ` : ''}{ipGeo[s.ip].country}</span></div>}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}><Clock size={10} /> Connected at {s.time}</div>
              </div>
            ))}
          </div>
        }
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }} className="audit-layout-grid">
        <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={13} color="var(--accent)" /><span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Access Logs Feed</span></div>
              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>{['all', 'logins', 'failures', 'security'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', border: `1px solid ${activeTab === tab ? 'rgba(99,102,241,0.2)' : 'var(--border-color)'}`, background: activeTab === tab ? 'var(--accent-light)' : 'transparent', color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)', transition: 'var(--transition)' }}>{tab === 'all' ? 'All' : tab === 'logins' ? 'Logins' : tab === 'failures' ? 'Failures' : 'Security Alerts'}</button>)}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '6px' }}><Info size={11} style={{ marginRight: '3px' }} /> Quick Filters:</span>
              {[{ id: 'all', label: 'All Traffic' }, { id: 'non-root', label: 'Non-Root Users' }, { id: 'bots', label: 'Suspected Bot Scans' }].map(p => <button key={p.id} onClick={() => setQuickFilter(p.id)} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', background: quickFilter === p.id ? 'rgba(255,255,255,0.06)' : 'transparent', color: quickFilter === p.id ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>{p.label}</button>)}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Search IP, User, location or ISP..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, minWidth: '180px', padding: '6px 12px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '0.75rem' }} />
              <select value={serverFilter} onChange={e => setServerFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer' }}>
                <option value="all">All Servers</option>
                {serversList.filter(s => s !== 'all').map(srv => <option key={srv} value={srv}>{srv}</option>)}
              </select>
            </div>
          </div>
          <div 
            style={{ display: 'flex', flexDirection: 'column', height: '480px', overflowY: 'auto' }}
            onScroll={handleSshScroll}
          >
            {loading ? <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: '10px', fontSize: '0.85rem' }}><RefreshCw size={14} className="spin-animation" /> Fetching events...</div>
              : displayEvents.length > 0 ? (
                <>
                  {displayEvents.map((event, idx) => {
                    const isSecurity = !!event.scenario;
                    const isBot = event.action === 'Bot Scan Dropped';
                    const cfg = isSecurity ? (securityConfig[event.action] || securityConfig['Security Alert']) : (statusConfig[event.status] || statusConfig.disconnected);
                    const isFirst = idx === 0 && searchQuery === '';
                    return (
                      <div key={idx} onClick={() => setSelectedEvent(event)} className="ssh-event-row">
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <div style={{ width: '32px', height: '32px', background: isBot ? 'rgba(245,158,11,0.05)' : cfg.bg, border: `1px solid ${isBot ? 'rgba(245,158,11,0.15)' : cfg.border}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isBot ? <Bot size={14} color="#f59e0b" /> : cfg.icon}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{isSecurity ? event.ip : event.user}</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: isBot ? 'rgba(245,158,11,0.08)' : cfg.bg, color: isBot ? '#f59e0b' : cfg.color, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${isBot ? 'rgba(245,158,11,0.15)' : cfg.border}` }}>{isBot ? 'Scan Blocked' : cfg.label}</span>
                              {isSecurity && <span style={{ fontSize: '0.62rem', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid rgba(245,158,11,0.15)' }}>{event.scenario.replace('crowdsecurity/', '')}</span>}
                              {isFirst && <span style={{ fontSize: '0.62rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid rgba(99,102,241,0.2)' }}>LATEST</span>}
                              {topThreat && event.ip === topThreat && <span style={{ fontSize: '0.62rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.2)' }}>AI FLAGGED</span>}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Server size={10} color="var(--text-muted)" /><strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{event.server}</strong></span><span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span><span className="text-mono" style={{ color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>{isSecurity ? event.details : `${event.ip}${event.port ? `:${event.port}` : ''}`}</span>{ipGeo[event.ip] && <><span style={{ color: 'rgba(255,255,255,0.1)' }} className="hide-on-mobile">·</span><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FlagIcon countryCode={ipGeo[event.ip].countryCode} /><span style={{ color: 'var(--text-muted)' }}>{ipGeo[event.ip].city ? `${ipGeo[event.ip].city}, ` : ''}{ipGeo[event.ip].country}</span></span></>}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 'auto' }}><Clock size={10} /> {event.time}</div>
                      </div>
                    );
                  })}
                  
                  {fetchingOlder && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                      <RefreshCw size={12} className="spin-animation" style={{ color: 'var(--accent)' }} />
                      <span>Fetching older security events...</span>
                    </div>
                  )}
                </>
              ) : <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}><div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', border: '1px solid var(--border-color)' }}><ShieldCheck size={28} color="var(--text-muted)" /></div><span className="text-muted" style={{ fontSize: '0.8rem' }}>No events match filters.</span></div>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="threats-sidebar">
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={14} color="var(--accent)" /> Geographic Sources</h3>
            {geoBreakdown.length === 0 ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No geographical stats.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{geoBreakdown.map(([country, info]) => <div key={country} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.01)' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}><FlagIcon countryCode={info.code} /><span style={{ color: 'var(--text-secondary)' }}>{country}</span></div><span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '10px' }}>{info.count} attempts</span></div>)}</div>}
          </div>
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><UserX size={14} color="var(--status-danger)" /> Top Targeted Accounts</h3>
            {targetUsernames.length === 0 ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No username telemetry.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{targetUsernames.map(([username, count]) => <div key={username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.01)' }}><span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{username}</span><span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)', color: 'var(--status-danger)', padding: '1px 6px', borderRadius: '10px' }}>{count} hits</span></div>)}</div>}
          </div>
          <div className="dashboard-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} color="var(--status-danger)" /> Top Attacker IPs</h3>
            {threatIPs.length === 0 ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No threats detected in the last 24h.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{threatIPs.map((threat, idx) => <div key={idx} style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="text-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{threat.ip}</span><span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.1)', color: 'var(--status-danger)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{threat.count} hits</span></div>{threat.geo.country && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}><FlagIcon countryCode={threat.geo.countryCode} /> <span>{threat.geo.city || 'Unknown City'}, {threat.geo.country}</span></div>}</div>)}</div>}
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#15171c', border: '1px solid var(--border-color)', borderRadius: '12px', width: '100%', maxWidth: '550px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={16} color="var(--accent)" /> Log Entry Inspector</span><button onClick={() => setSelectedEvent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button></div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '75vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px' }}><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Target Server</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedEvent.server}</div></div><div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px' }}><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Timestamp</div><div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedEvent.time}</div></div></div>
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Origin Geolocation</span><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>IP Address</div><div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedEvent.ip}</div></div><div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Country</div><div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>{ipGeo[selectedEvent.ip] && <FlagIcon countryCode={ipGeo[selectedEvent.ip].countryCode} />} {ipGeo[selectedEvent.ip]?.country || 'Unknown'}</div></div>{ipGeo[selectedEvent.ip]?.city && <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>City</div><div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{ipGeo[selectedEvent.ip].city}</div></div>}{ipGeo[selectedEvent.ip]?.isp && <div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ISP Provider</div><div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ipGeo[selectedEvent.ip].isp}</div></div>}</div></div>
              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Security Metadata</span><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}><div><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Target Account Username</span><strong style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{selectedEvent.user || '—'}</strong></div><div><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Action Classification</span><span style={{ fontSize: '0.72rem', fontWeight: 700, color: selectedEvent.status === 'success' ? 'var(--status-healthy)' : 'var(--status-danger)' }}>{selectedEvent.action}</span></div>{selectedEvent.port && <div><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Port Address</span><span style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{selectedEvent.port}</span></div>}{selectedEvent.scenario && <div><span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Triggered Scenario</span><span style={{ fontSize: '0.78rem', color: '#f59e0b' }}>{selectedEvent.scenario}</span></div>}</div></div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)' }}><button onClick={() => setSelectedEvent(null)} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Close Inspector</button></div>
          </div>
        </div>
      )}

      <style>{`
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
        @media (min-width: 1024px) { .audit-layout-grid { grid-template-columns: 3fr 1fr !important; } }
        @media (max-width: 576px) { .ssh-event-row { grid-template-columns: 1fr auto !important; padding: 8px 10px !important; gap: 6px !important; border-left: none !important; } .ssh-event-icon { display: none !important; } .hide-on-mobile { display: none !important; } .ssh-event-row span, .ssh-event-row strong { font-size: 0.72rem !important; } }
        .live-pulse { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
      `}</style>
    </div>
  );
}
