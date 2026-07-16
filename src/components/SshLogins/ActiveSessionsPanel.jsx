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
    <div className="ssh-sidebar custom-scrollbar" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '100%' }}>
      
      {/* Top Attacking Countries */}
      {topCountries.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.76rem' }}>
            <Activity size={12} color="var(--text-muted)" />
            Top Attacking Countries
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topCountries.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {t.countryCode && (
                    <img src={`https://flagcdn.com/16x12/${t.countryCode.toLowerCase()}.png`} width="12" height="9" alt={t.countryCode} />
                  )}
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{t.country}</span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 600 }}>{t.attempts} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>attempts</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Targeted Accounts */}
      <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.76rem' }}>
          <User size={12} color="var(--status-danger)" />
          Top Targeted Accounts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topAccounts.map(([acc, hits]) => (
            <div key={acc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{acc}</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--status-danger)', fontWeight: 600 }}>{hits} <span style={{ fontSize: '0.58rem', fontWeight: 400, color: 'var(--text-muted)' }}>hits</span></span>
            </div>
          ))}
          {topAccounts.length === 0 && <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No failed logins.</span>}
        </div>
      </div>

      {/* Top Attacker IPs */}
      <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.76rem' }}>
          <AlertTriangle size={12} color="var(--status-danger)" />
          Top Attacker IPs
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {topIps.map(([ip, hits]) => {
            const geo = ipGeo[ip];
            return (
              <div key={ip} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{ip}</div>
                  {geo && geo.countryCode && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      <img src={`https://flagcdn.com/16x12/${geo.countryCode.toLowerCase()}.png`} width="10" height="8" alt={geo.countryCode} />
                      {geo.city}, {geo.country}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--status-danger)', fontWeight: 600 }}>{hits} <span style={{ fontSize: '0.58rem', fontWeight: 400, color: 'var(--text-muted)' }}>hits</span></span>
              </div>
            );
          })}
          {topIps.length === 0 && <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No failed logins.</span>}
        </div>
      </div>

      {/* Active Sessions */}
      <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.76rem' }}>
            <ShieldCheck size={12} color="var(--status-healthy)" />
            Active Sessions
          </div>
          <span style={{ background: 'rgba(16,185,129,0.04)', color: 'var(--status-healthy)', border: '1px solid rgba(16,185,129,0.15)', padding: '1px 6px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 600 }}>
            {activeSessions.length}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeSessions.map((session, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 600 }}>{session.user}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{session.time}</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{session.ip}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{session.server}</span>
            </div>
          ))}
          {activeSessions.length === 0 && <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No active SSH sessions.</span>}
        </div>
      </div>
      
    </div>
  );
}
