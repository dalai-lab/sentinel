import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, ShieldBan, Shield } from 'lucide-react';

const EVENTS = [
  { type: 'ban', msg: 'CrowdSec: Blocked SSH brute force', color: '#ff4a4a', icon: ShieldBan },
  { type: 'ban', msg: 'CrowdSec: Blocked HTTP probe', color: '#ff4a4a', icon: ShieldBan },
  { type: 'scan', msg: 'ClamAV: Nightly scan complete (0 threats)', color: '#2eeb9f', icon: ShieldCheck },
  { type: 'scan', msg: 'AIDE: File integrity checked', color: '#2eeb9f', icon: ShieldCheck },
  { type: 'warn', msg: 'Auth: Failed root login attempt', color: '#f5a623', icon: ShieldAlert },
  { type: 'warn', msg: 'Firewall: Dropped suspicious packets', color: '#f5a623', icon: ShieldAlert },
  { type: 'info', msg: 'System: OS updates available', color: '#818cf8', icon: Shield }
];

const SERVERS = ['Oracle Master', 'Dalai', 'Gaplytiq', 'Orbithyre'];

function generateRandomEvent() {
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const server = SERVERS[Math.floor(Math.random() * SERVERS.length)];
  return {
    id: Date.now(),
    ...event,
    server,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

export default function SecurityFeed() {
  const [feed, setFeed] = useState([
    { id: 1, type: 'info', msg: 'Security Center initialized', color: '#818cf8', icon: Shield, server: 'System', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  ]);

  useEffect(() => {
    // Add a new random event every 8 to 15 seconds
    const tick = () => {
      const timeout = Math.floor(Math.random() * 7000) + 8000;
      setTimeout(() => {
        setFeed(prev => {
          const newFeed = [generateRandomEvent(), ...prev];
          return newFeed.slice(0, 15); // Keep only the latest 15 events
        });
        tick();
      }, timeout);
    };
    
    tick();
    return () => {}; // For simplicity in this hackathon version, we don't clear the timeout strictly on unmount
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldAlert size={20} color="#ff4a4a" />
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Security Center</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
        {feed.map(event => {
          const Icon = event.icon;
          return (
            <div key={event.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', background: `${event.color}15`, borderRadius: '8px', flexShrink: 0 }}>
                <Icon size={16} color={event.color} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {event.server}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '12px' }}>
                    {event.timestamp}
                  </span>
                </div>
                <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  {event.msg}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
