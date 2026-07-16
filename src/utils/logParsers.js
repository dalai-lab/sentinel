const SERVER_MAP = {
  // by IP
  '80.225.241.81': 'Oracle DB Server',
  '31.97.235.136': 'Orbithyre',
  '168.231.122.248': 'Dalai',
  '72.61.235.141': 'Gaplytiq',
  // by hostname
  'instance-20260630-1713': 'Oracle DB Server',
  'srv1213878': 'Orbithyre',
  'srv1176513': 'Gaplytiq',
  'srv1055295': 'Dalai',
};

// Known CDN/cloud IP prefixes — safe infrastructure, not real attackers
const CDN_PREFIXES = [
  '172.64.', '172.65.', '172.66.', '172.67.', '172.68.', '172.69.',
  '172.70.', '172.71.',   // Cloudflare 172.64.0.0/13
  '104.16.', '104.17.', '104.18.', '104.19.', '104.20.', '104.21.',
  '162.158.',             // Cloudflare
  '103.21.244.', '103.22.200.', '103.31.4.',
  '141.101.64.', '141.101.65.', '141.101.66.', '141.101.67.',
];

export function isKnownCdn(ip) {
  if (!ip) return false;
  return CDN_PREFIXES.some(p => ip.startsWith(p));
}

// Humanize a raw seconds string like "14.999252431s" or "61.2s"
function formatDuration(raw) {
  if (!raw) return raw;
  const secs = parseFloat(raw);
  if (isNaN(secs)) return raw;
  const rounded = Math.round(secs);
  if (rounded < 60) return `${rounded}s`;
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function getFriendlyServer(rawService) {
  if (!rawService) return 'Unknown Server';
  const clean = rawService.trim().replace('.log', '');
  return SERVER_MAP[clean] || clean;
}

export function parseSshEvent(log) {
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
    // Match actual username — it follows the type of user, before 'from IP'
    const mu = msg.match(/disconnected from (?:invalid user |authenticating user |user )(\S+)/i);
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
  
  // clickhouse returns log.timestamp in nanoseconds (string or BigInt) or ISO string
  let rawTs = log.rawTs || log.time || log.timestamp;
  if (typeof rawTs === 'string' && isNaN(Number(rawTs))) {
    rawTs = new Date(rawTs).getTime();
  } else if (rawTs && String(rawTs).length >= 18) {
    try {
      rawTs = Math.floor(Number(BigInt(rawTs) / 1000000n)); // Convert ns to ms
    } catch (e) {
      rawTs = Number(rawTs);
    }
  } else if (rawTs) {
    rawTs = Number(rawTs);
  }
  
  const localTime = new Date(rawTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    rawTs,
    time: localTime !== 'Invalid Date' ? localTime : log.time,
    user: user || 'unknown',
    ip,
    port,
    authMethod,
    action,
    status,
    isBotScan,
    server,
    serverRaw: log.service || ''
  };
}

export function parseCrowdSecEvent(log) {
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
      details = `${eventsMatch[1]} events over ${formatDuration(eventsMatch[2])}`;
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
  
  let rawTs = log.rawTs || log.time || log.timestamp;
  if (typeof rawTs === 'string' && isNaN(Number(rawTs))) {
    rawTs = new Date(rawTs).getTime();
  } else if (rawTs && String(rawTs).length >= 18) {
    try {
      rawTs = Math.floor(Number(BigInt(rawTs) / 1000000n)); // Convert ns to ms
    } catch (e) {
      rawTs = Number(rawTs);
    }
  } else if (rawTs) {
    rawTs = Number(rawTs);
  }
  
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

export function computeActiveSessions(sortedEvents) {
  // sortedEvents is newest-first. Reverse to process chronologically (oldest first).
  const chronological = [...sortedEvents].reverse();
  // key: server+port uniquely identifies an SSH session
  const sessionState = {}; // key -> { event, closed }

  for (const e of chronological) {
    const key = `${e.serverRaw || e.server}__${e.port || e.ip}`;
    if (e.status === 'success') {
      // A new login — record as open session
      sessionState[key] = { event: e, closed: false };
    } else if (e.status === 'disconnected' && sessionState[key]) {
      // The session was explicitly closed
      sessionState[key].closed = true;
    }
  }

  // Only return sessions that were opened and never explicitly closed
  return Object.values(sessionState)
    .filter(s => !s.closed && s.event)
    .map(s => s.event);
}
