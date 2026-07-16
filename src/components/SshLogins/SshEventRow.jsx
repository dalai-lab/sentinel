import React from 'react';
import { ShieldCheck, Key, LogOut, Wifi, Info, ShieldAlert, Bot } from 'lucide-react';

function FlagIcon({ countryCode }) {
  if (!countryCode) return null;
  const code = countryCode.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/16x12/${code}.png`}
      width="12" height="9" alt={code}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '1px' }}
    />
  );
}

// Map CrowdSec scenario slugs → readable names
function friendlyScenario(raw) {
  if (!raw) return '';
  const map = {
    'crowdsecurity/ssh-bf':                    'repeated login attempts',
    'crowdsecurity/ssh-slow-bf':               'slow login scanning attempts',
    'crowdsecurity/ssh-bf-jupiter':            'brute force attempt',
    'crowdsecurity/iptables-scan-multi_ports': 'port scan activity',
    'crowdsecurity/http-scan-uniques_404':     'web scanning activity',
    'crowdsecurity/http-bad-user-agent':       'suspicious client request',
    'crowdsecurity/http-bf-wordpress-wp_login':'WordPress login scanning',
  };
  if (map[raw]) return map[raw];
  return raw.replace(/^crowdsecurity\//, '').replace(/-/g, ' ');
}

export default function SshEventRow({ event, geo, onClick }) {
  // Determine Type and Statement
  let icon = <Info size={12} color="var(--text-muted)" />;
  let statement = '';
  let isImportant = false;

  const geoString = geo && geo.country ? `${geo.city ? `${geo.city}, ` : ''}${geo.country}` : '';

  if (event.isWhitelisted) {
    icon = <ShieldCheck size={12} color="var(--status-healthy)" />;
    statement = `Trusted CDN traffic (${event.ip}) verified and allowed`;
  } else if (event.scenario) {
    // CrowdSec threat block
    isImportant = true;
    const isBan = event.action === 'IP Banned / Blocked' || event.action === 'IP Banned';
    icon = <ShieldAlert size={12} color={isBan ? 'var(--status-danger)' : 'var(--status-warning)'} />;
    
    const reason = event.details || friendlyScenario(event.scenario) || 'suspicious activity';
    if (isBan) {
      statement = `IP address ${event.ip} blocked due to ${reason}`;
    } else {
      statement = `Suspicious activity detected from ${event.ip} (${reason})`;
    }
  } else {
    // Regular SSH event
    if (event.action === 'Login') {
      icon = <Wifi size={12} color="var(--status-healthy)" />;
      statement = `User "${event.user}" successfully logged in`;
    } else if (event.action === 'Auth Failed') {
      icon = <Key size={12} color="var(--status-danger)" />;
      statement = `Unauthorized login attempt for user "${event.user}" blocked`;
    } else if (event.action === 'Bot Scan Dropped') {
      icon = <Bot size={12} color="var(--status-warning)" />;
      statement = `Automated bot scan attempt by user "${event.user}" dropped`;
    } else if (event.action === 'Session Ended' || event.action === 'Disconnected') {
      icon = <LogOut size={12} color="var(--text-muted)" />;
      statement = `Session ended for user "${event.user}"`;
    } else {
      icon = <Info size={12} color="var(--text-muted)" />;
      statement = `${event.action || 'Connection'} event for user "${event.user}"`;
    }
  }

  return (
    <div 
      className="log-row"
      onClick={() => onClick(event)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-rgb-255-255-255-0-015)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        background: isImportant ? 'var(--color-rgb-239-68-68-0-005)' : 'transparent',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-rgb-255-255-255-0-015)'}
      onMouseLeave={(e) => e.currentTarget.style.background = isImportant ? 'var(--color-rgb-239-68-68-0-005)' : 'transparent'}
    >
      {/* Left Icon Panel */}
      <div style={{
        width: '26px', height: '26px', borderRadius: '6px',
        background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--color-rgb-255-255-255-0-02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {icon}
      </div>

      {/* Main Info Column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {/* Row 1: Plain English Statement */}
        <span style={{ 
          fontSize: '0.74rem', 
          fontWeight: isImportant ? 550 : 500, 
          color: isImportant ? 'var(--text-primary)' : 'var(--text-secondary)',
          lineHeight: '1.25'
        }}>
          {statement}
        </span>

        {/* Row 2: Secondary Metadata Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
          <span style={{ 
            background: 'var(--color-rgb-255-255-255-0-02)', 
            border: '1px solid var(--color-rgb-255-255-255-0-03)',
            padding: '2px 6px',
            borderRadius: '4px',
            color: 'var(--text-secondary)'
          }}>
            {event.server}
          </span>
        </div>
      </div>

      {/* Right Column: IP + Country + Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', width: '100px', textAlign: 'right' }}>
          {event.ip}
        </span>
        {geoString && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <FlagIcon countryCode={geo.countryCode} />
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {geoString}
            </span>
          </div>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', width: '75px', textAlign: 'right' }}>
          {event.time}
        </span>
      </div>
    </div>
  );
}
