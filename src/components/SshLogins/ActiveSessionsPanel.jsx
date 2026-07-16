import React from 'react';
import { User, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { computeActiveSessions } from '../../utils/logParsers';

export default function ActiveSessionsPanel({ events, ipGeo }) {
  const activeSessions = computeActiveSessions(events);

  // Calculate top attacking countries
  const countryHits = {};
  events.filter(e => e.status === 'failed').forEach(e => {
    const geo = ipGeo[e.ip];
    if (geo && geo.country && geo.country !== 'Private Network') {
      if (!countryHits[geo.country]) {
        countryHits[geo.country] = { attempts: 0, code: geo.countryCode };
      }
      countryHits[geo.country].attempts += 1;
    }
  });
  const topCountries = Object.entries(countryHits)
    .sort((a, b) => b[1].attempts - a[1].attempts)
    .slice(0, 3)
    .map(([country, data]) => ({ country, attempts: data.attempts, countryCode: data.code }));

  // Calculate top targeted accounts
  const accountHits = {};
  events.filter(e => e.user && e.status === 'failed').forEach(e => {
    accountHits[e.user] = (accountHits[e.user] || 0) + 1;
  });
  const topAccounts = Object.entries(accountHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Calculate top attacker IPs
  const ipHits = {};
  events.filter(e => e.status === 'failed').forEach(e => {
    ipHits[e.ip] = (ipHits[e.ip] || 0) + 1;
  });
  const topIps = Object.entries(ipHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="ssh-sidebar" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Attacking Countries */}
      {topCountries.length > 0 && (
        <div className="metric-card" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-color)', fontWeight: 600 }}>
            <Activity size={16} color="var(--primary-color)" />
            Top Attacking Countries
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topCountries.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {t.countryCode && (
                    <img src={`https://flagcdn.com/16x12/${t.countryCode.toLowerCase()}.png`} width="16" height="12" alt={t.countryCode} />
                  )}
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.country}</span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600 }}>{t.attempts} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>attempts</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Targeted Accounts */}
      <div className="metric-card" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-color)', fontWeight: 600 }}>
          <User size={16} color="var(--status-danger)" />
          Top Targeted Accounts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {topAccounts.map(([acc, hits]) => (
            <div key={acc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{acc}</span>
              <span style={{ fontSize: '13px', color: 'var(--status-danger)', fontWeight: 600 }}>{hits} <span style={{ fontSize: '11px' }}>hits</span></span>
            </div>
          ))}
          {topAccounts.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No failed logins recorded.</span>}
        </div>
      </div>

      {/* Top Attacker IPs */}
      <div className="metric-card" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-color)', fontWeight: 600 }}>
          <AlertTriangle size={16} color="var(--status-danger)" />
          Top Attacker IPs
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {topIps.map(([ip, hits]) => {
            const geo = ipGeo[ip];
            return (
              <div key={ip} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', fontFamily: 'monospace', fontWeight: 600 }}>{ip}</div>
                  {geo && geo.countryCode && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <img src={`https://flagcdn.com/16x12/${geo.countryCode.toLowerCase()}.png`} width="12" height="9" alt={geo.countryCode} />
                      {geo.city}, {geo.country}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--status-danger)', fontWeight: 600 }}>{hits} <span style={{ fontSize: '11px' }}>hits</span></span>
              </div>
            );
          })}
          {topIps.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No failed logins recorded.</span>}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="metric-card" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)', fontWeight: 600 }}>
            <ShieldCheck size={16} color="var(--status-healthy)" />
            Active Sessions
          </div>
          <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--status-healthy)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
            {activeSessions.length}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeSessions.map((session, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 600 }}>{session.user}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{session.time}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{session.ip}</span>
              <span style={{ fontSize: '11px', color: 'var(--primary-color)' }}>{session.server}</span>
            </div>
          ))}
          {activeSessions.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No active SSH sessions.</span>}
        </div>
      </div>
      
    </div>
  );
}
