import React from 'react';
import { ShieldAlert, Key, LogOut, Wifi, AlertTriangle, Bot, Server } from 'lucide-react';

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

export default function SshEventRow({ event, geo, onClick }) {
  // Determine if it's a security event or an SSH event
  const isSecurity = !!event.scenario;
  
  // Render Security Alert
  if (isSecurity) {
    const config = securityConfig[event.scenario] || securityConfig['Security Alert'];
    return (
      <div 
        className="log-row security-row" 
        onClick={() => onClick(event)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          cursor: 'pointer',
          transition: 'background 0.2s',
          background: event.isWhitelisted ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.03)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = event.isWhitelisted ? 'rgba(255,255,255,0.02)' : 'rgba(239,68,68,0.03)'}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: config.bg, border: `1px solid ${config.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {config.icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: config.color, fontWeight: 600, fontSize: '14px' }}>
                {config.label}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {event.server}
              </span>
              {event.isWhitelisted && (
                <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  Whitelisted
                </span>
              )}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              {event.time}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-color)' }}>
            <span style={{ fontFamily: 'monospace' }}>{event.ip}</span>
            {geo && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <FlagIcon countryCode={geo.countryCode} />
                {geo.city}, {geo.country}
              </span>
            )}
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span>{event.details || event.scenario}</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Standard SSH Login Event
  const config = statusConfig[event.status === 'success' ? 'connected' : event.status === 'failed' ? 'failures' : 'disconnected'];
  
  return (
    <div 
      className="log-row"
      onClick={() => onClick(event)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: config.bg, border: `1px solid ${config.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Key size={14} color={config.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-color)', fontWeight: 600, fontSize: '14px' }}>
              {event.user}
            </span>
            <span style={{ 
              background: event.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', 
              color: event.status === 'success' ? '#10b981' : 'var(--text-muted)', 
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' 
            }}>
              {event.action}
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {event.time}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={12} /> {event.server}
          </span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-color)' }}>
            {event.ip}{event.port ? `:${event.port}` : ''}
          </span>
          {geo && geo.countryCode && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FlagIcon countryCode={geo.countryCode} />
              {geo.city}, {geo.country}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
