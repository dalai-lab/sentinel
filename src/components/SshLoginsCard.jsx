import React, { useState, useEffect } from 'react';
import { ShieldAlert, Key, LogOut, Clock, User, Globe, Server, ShieldCheck } from 'lucide-react';
import { fetchRealLogs } from '../api/signoz';

const SERVER_MAP = {
  'instance-20260630-1713': 'Oracle database server',
  'srv1213878': 'Orbithyre',
  'srv1176513': 'Gaplytiq',
  'srv1055295': 'Dalai'
};

function getFriendlyServerName(host) {
  if (!host) return 'Unknown Server';
  const cleanHost = host.trim().replace('.log', '');
  return SERVER_MAP[cleanHost] || cleanHost;
}

function parseSshLog(log) {
  const msg = log.msg || '';
  const lowerMsg = msg.toLowerCase();
  
  // Only process SSH daemon logs
  if (!lowerMsg.includes('sshd') && !lowerMsg.includes('ssh')) return null;
  
  let user = 'system';
  let ip = 'internal';
  let action = '';
  let status = ''; // 'success', 'failed', 'info'
  
  // 1. Accepted publickey / password
  if (lowerMsg.includes('accepted')) {
    action = 'Login Successful';
    status = 'success';
    const match = msg.match(/Accepted\s+(?:publickey|password)\s+for\s+(\S+)\s+from\s+(\S+)/i);
    if (match) {
      user = match[1];
      ip = match[2];
    }
  }
  // 2. Failed password / Invalid user
  else if (lowerMsg.includes('failed password') || lowerMsg.includes('invalid user')) {
    action = 'Auth Failed';
    status = 'failed';
    const matchUser = msg.match(/(?:Failed password for|Invalid user)\s+(\S+)/i);
    const matchIp = msg.match(/from\s+(\S+)/i);
    if (matchUser) user = matchUser[1];
    if (matchIp) ip = matchIp[1];
  }
  // 3. Disconnected / Session closed
  else if (lowerMsg.includes('disconnected') || lowerMsg.includes('session closed') || lowerMsg.includes('disconnect')) {
    action = 'Session Terminated';
    status = 'disconnected';
    const matchUser = msg.match(/(?:disconnected from user|session closed for user|session closed for)\s+(\S+)/i);
    const matchIp = msg.match(/from\s+(\S+)/i);
    if (matchUser) user = matchUser[1];
    if (matchIp) ip = matchIp[1];
  }
  
  if (!action) return null;
  
  return {
    time: log.time,
    user,
    ip,
    action,
    status,
    server: getFriendlyServerName(log.service)
  };
}

export default function SshLoginsCard() {
  const [sshEvents, setSshEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSshLogs = async () => {
    try {
      const now = Date.now();
      const pastDay = now - 24 * 60 * 60 * 1000; // fetch last 24 hours of logs
      const rawLogs = await fetchRealLogs(pastDay, now);
      if (Array.isArray(rawLogs)) {
        const parsed = rawLogs
          .map(log => parseSshLog(log))
          .filter(Boolean);
        
        // Remove duplicates if any, sorting by most recent
        const unique = [];
        const seen = new Set();
        for (const item of parsed.reverse()) {
          const key = `${item.time}-${item.user}-${item.ip}-${item.status}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }
        setSshEvents(unique.slice(0, 10)); // keep last 10 entries
      }
    } catch (err) {
      console.error('Failed to load SSH logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSshLogs();
    const interval = setInterval(loadSshLogs, 6000); // refresh every 6 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'success':
        return {
          bg: 'var(--status-healthy-bg)',
          color: 'var(--status-healthy)',
          border: 'rgba(16, 185, 129, 0.15)',
          icon: <Key size={14} color="var(--status-healthy)" />
        };
      case 'failed':
        return {
          bg: 'var(--status-danger-bg)',
          color: 'var(--status-danger)',
          border: 'rgba(239, 68, 68, 0.15)',
          icon: <ShieldAlert size={14} color="var(--status-danger)" />
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.02)',
          color: 'var(--text-secondary)',
          border: 'var(--border-color)',
          icon: <LogOut size={14} color="var(--text-secondary)" />
        };
    }
  };

  return (
    <div className="dashboard-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={18} color="var(--accent)" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>SSH Access Audits</h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Real-time SSH session tail</div>
          </div>
        </div>
        
        {!loading && sshEvents.length > 0 && (
          <span style={{ 
            fontSize: '0.7rem', 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid var(--border-color)',
            padding: '2px 8px', 
            borderRadius: '12px', 
            color: 'var(--text-secondary)'
          }}>
            {sshEvents.length} Active Audits
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flex: 1 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Parsing SSH events...</span>
          </div>
        ) : sshEvents.length > 0 ? (
          sshEvents.map((event, idx) => {
            const style = getStatusStyle(event.status);
            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  gap: '12px',
                  transition: 'var(--transition)'
                }}
                className="ssh-audit-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {style.icon}
                  </div>
                  
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {event.user}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        background: style.bg,
                        color: style.color,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        border: `1px solid ${style.border}`
                      }}>
                        {event.action}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Server size={11} color="var(--text-muted)" />
                        {event.server}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={11} color="var(--text-muted)" />
                        {event.ip}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <Clock size={11} />
                  <span>{event.time}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, padding: '24px 0' }}>
            <div style={{ padding: '12px', background: 'var(--status-healthy-bg)', borderRadius: '50%', marginBottom: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <ShieldCheck size={24} color="var(--status-healthy)" />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--status-healthy)', fontWeight: 600 }}>Zero SSH Access Warnings</span>
            <span className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px', textAlign: 'center' }}>No remote connection attempts registered.</span>
          </div>
        )}
      </div>
      
      <style>{`
        .ssh-audit-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: var(--border-hover) !important;
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
}
