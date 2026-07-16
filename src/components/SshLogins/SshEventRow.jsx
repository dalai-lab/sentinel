import React from 'react';
import { ShieldAlert, Key, LogOut, Wifi, AlertTriangle, Bot, Server } from 'lucide-react';

const statusConfig = {
  connected: { label: 'Session Active', bg: 'rgba(16,185,129,0.04)', color: 'var(--status-healthy)', border: 'rgba(16,185,129,0.15)', icon: <Wifi size={12} color="var(--status-healthy)" /> },
  failures: { label: 'Auth Failed', bg: 'rgba(239,68,68,0.04)', color: 'var(--status-danger)', border: 'rgba(239,68,68,0.15)', icon: <ShieldAlert size={12} color="var(--status-danger)" /> },
  disconnected: { label: 'Closed', bg: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)', border: 'rgba(255,255,255,0.02)', icon: <LogOut size={12} color="var(--text-muted)" /> }
};

const securityConfig = {
  'SSH Bruteforce Blocked': { label: 'Threat Blocked', bg: 'rgba(239,68,68,0.04)', color: 'var(--status-danger)', border: 'rgba(239,68,68,0.15)', icon: <ShieldAlert size={12} color="var(--status-danger)" /> },
  'Bot Scan Dropped': { label: 'Scan Blocked', bg: 'rgba(245,158,11,0.04)', color: 'var(--status-warning)', border: 'rgba(245,158,11,0.15)', icon: <Bot size={12} color="var(--status-warning)" /> },
  'Security Alert': { label: 'Anomaly', bg: 'rgba(245,158,11,0.04)', color: 'var(--status-warning)', border: 'rgba(245,158,11,0.15)', icon: <AlertTriangle size={12} color="var(--status-warning)" /> }
};

function FlagIcon({ countryCode }) {
  if (!countryCode) return null;
  const code = countryCode.toLowerCase();
  return (
    <img 
      src={`https://flagcdn.com/16x12/${code}.png`} 
      width="12" 
      height="9" 
      alt={code} 
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '1px', marginTop: '-2px' }} 
    />
  );
}

export default function SshEventRow({ event, geo, onClick }) {
  const isSecurity = !!event.scenario;
  
  if (isSecurity) {
    const config = securityConfig[event.scenario] || securityConfig['Security Alert'];
    return (
      <div 
        className="log-row security-row" 
        onClick={() => onClick(event)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.015)',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
          background: event.isWhitelisted ? 'rgba(255,255,255,0.005)' : 'rgba(239,68,68,0.008)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
        onMouseLeave={(e) => e.currentTarget.style.background = event.isWhitelisted ? 'rgba(255,255,255,0.005)' : 'rgba(239,68,68,0.008)'}
      >
        <div style={{
          width: '24px', height: '24px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          {config.icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: config.color, fontWeight: 550, fontSize: '0.74rem' }}>
                {config.label}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '1px 6px', borderRadius: '3px', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                {event.server}
              </span>
              {event.isWhitelisted && (
                <span style={{ background: 'rgba(16,185,129,0.05)', color: 'var(--status-healthy)', border: '1px solid rgba(16,185,129,0.15)', padding: '1px 6px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 500 }}>
                  Whitelisted
                </span>
              )}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
              {event.time}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{event.ip}</span>
            {geo && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
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

  const config = statusConfig[event.status === 'success' ? 'connected' : event.status === 'failed' ? 'failures' : 'disconnected'];
  
  return (
    <div 
      className="log-row"
      onClick={() => onClick(event)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.015)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: '24px', height: '24px', borderRadius: 'var(--radius-sm)',
        background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Key size={12} color={config.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 550, fontSize: '0.74rem' }}>
              {event.user}
            </span>
            <span style={{ 
              background: event.status === 'success' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.01)', 
              color: event.status === 'success' ? 'var(--status-healthy)' : 'var(--text-muted)', 
              border: `1px solid ${event.status === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)'}`,
              padding: '1px 6px', borderRadius: '3px', fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.5px' 
            }}>
              {event.action}
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
            {event.time}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Server size={11} /> {event.server}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            {event.ip}{event.port ? `:${event.port}` : ''}
          </span>
          {geo && geo.countryCode && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FlagIcon countryCode={geo.countryCode} />
              {geo.city}, {geo.country}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
