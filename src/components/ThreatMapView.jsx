import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { fetchRealLogs, fetchIpInfo } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';
import { Map, ShieldAlert, Globe, Activity, TrendingUp, Clock, Server, RefreshCw } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SERVER_LOCATIONS = {
  'Oracle database server': { lat: 19.0748, lon: 72.8856, label: 'Oracle DB' },
  'Orbithyre': { lat: 19.0848, lon: 72.9000, label: 'Orbithyre' },
  'Gaplytiq': { lat: 19.0648, lon: 72.8700, label: 'Gaplytiq' },
  'Dalai': { lat: 19.0900, lon: 72.8856, label: 'Dalai' }
};

// Time window options
const TIME_WINDOWS = [
  { id: 3600000, name: 'Last 1 Hour' },
  { id: 21600000, name: 'Last 6 Hours' },
  { id: 86400000, name: 'Last 24 Hours' },
];

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px' }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function ThreatMapView() {
  const [logs, setLogs] = useState([]);
  const [geoData, setGeoData] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState(86400000); // 24h default
  const [selectedOrigin, setSelectedOrigin] = useState(null);

  useEffect(() => {
    loadThreats();
    const interval = setInterval(loadThreats, 30000);
    return () => clearInterval(interval);
  }, [timeWindow]);

  async function loadThreats() {
    setLoading(true);
    try {
      const since = Date.now() - timeWindow;
      const sshLogs = await fetchRealLogs(since, null, 'ssh', '');
      
      const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
      const ipsToLookup = [];
      const parsedLogs = [];

      sshLogs.forEach(log => {
        const isFailed = log.msg.includes('Failed password') || log.msg.includes('Invalid user') || log.msg.includes('Connection closed') || log.msg.includes('authentication failure');
        const match = log.msg.match(ipRegex);
        if (isFailed && match) {
          const ip = match[0];
          if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.')) {
            ipsToLookup.push(ip);
            parsedLogs.push({ ...log, ip, hostFriendly: getFriendlyName(log.service || log.host || '') });
          }
        }
      });

      if (ipsToLookup.length > 0) {
        const uniqueIps = [...new Set(ipsToLookup)];
        const geoMap = await fetchIpInfo(uniqueIps);
        setGeoData(prev => ({ ...prev, ...geoMap }));
      }
      
      setLogs(parsedLogs);
    } catch (err) {
      console.error('[ThreatMap]', err);
    } finally {
      setLoading(false);
    }
  }

  // --- Analytics ---
  const attackerMap = useMemo(() => {
    const m = {};
    logs.forEach(log => {
      if (!m[log.ip]) m[log.ip] = { ip: log.ip, hits: 0, targets: new Set(), geo: geoData[log.ip] || null };
      m[log.ip].hits += 1;
      if (log.hostFriendly) m[log.ip].targets.add(log.hostFriendly);
    });
    return m;
  }, [logs, geoData]);

  const topAttackers = useMemo(() => {
    return Object.values(attackerMap)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map(a => ({ ...a, targets: Array.from(a.targets) }));
  }, [attackerMap]);

  // Aggregate: countries
  const countryMap = useMemo(() => {
    const m = {};
    Object.values(attackerMap).forEach(atk => {
      const geo = atk.geo;
      if (!geo || !geo.country || geo.country === 'Private Network') return;
      const key = geo.country;
      if (!m[key]) m[key] = { country: key, countryCode: geo.countryCode, hits: 0, ips: new Set() };
      m[key].hits += atk.hits;
      m[key].ips.add(atk.ip);
    });
    return m;
  }, [attackerMap]);

  const topCountries = useMemo(() => {
    return Object.values(countryMap)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map(c => ({ ...c, ips: c.ips.size }));
  }, [countryMap]);

  // Aggregate: targets
  const targetMap = useMemo(() => {
    const m = {};
    logs.forEach(log => {
      const t = log.hostFriendly || 'Unknown';
      if (!m[t]) m[t] = 0;
      m[t] += 1;
    });
    return m;
  }, [logs]);

  // Map markers: one per unique IP with geo data, sized by hit count
  const markers = useMemo(() => {
    const seen = new Set();
    const result = [];
    Object.values(attackerMap).forEach(atk => {
      const geo = atk.geo;
      if (geo && geo.lat && geo.lon && geo.lat !== 0 && !seen.has(atk.ip)) {
        seen.add(atk.ip);
        result.push({ ...atk, geo });
      }
    });
    return result;
  }, [attackerMap]);

  const maxHits = markers.length > 0 ? Math.max(...markers.map(m => m.hits)) : 1;
  const totalAttacks = logs.length;
  const uniqueIPs = Object.keys(attackerMap).length;
  const topCountry = topCountries[0]?.country || '—';
  const mostTargeted = Object.entries(targetMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', paddingBottom: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Map size={18} color="var(--text-secondary)" /> Brute-Force Intelligence Center
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Real-time SSH brute-force attack intelligence, attacker profiling, and geographic distribution.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={timeWindow}
            onChange={e => setTimeWindow(parseInt(e.target.value))}
            style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '0.74rem' }}
          >
            {TIME_WINDOWS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={loadThreats} style={{ background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.72rem' }}>
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <StatCard icon={ShieldAlert} label="Total Attempts" value={totalAttacks.toLocaleString()} color="var(--status-danger)" sub="Blocked by SSH" />
        <StatCard icon={Globe} label="Unique Attackers" value={uniqueIPs.toLocaleString()} color="var(--status-warning)" sub="Distinct IPs" />
        <StatCard icon={TrendingUp} label="Top Origin" value={topCountry} color="#8b5cf6" sub={topCountries[0] ? `${topCountries[0].hits} attempts` : ''} />
        <StatCard icon={Server} label="Most Targeted" value={mostTargeted} color="#06b6d4" sub={targetMap[mostTargeted] ? `${targetMap[mostTargeted]} hits` : ''} />
      </div>

      {/* Main content: Map + Side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', flex: 1, minHeight: 0 }}>
        
        {/* World Map */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
              <RefreshCw size={24} className="spin" color="var(--text-primary)" />
            </div>
          )}
          <ComposableMap projectionConfig={{ scale: 160, center: [20, 10] }} style={{ width: '100%', height: '100%' }}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="rgba(255, 255, 255, 0.03)"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: 'rgba(255, 255, 255, 0.08)', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Server target markers */}
            {Object.entries(SERVER_LOCATIONS).map(([name, coords]) => (
              <Marker key={name} coordinates={[coords.lon, coords.lat]}>
                <circle r={5} fill="#4f46e5" />
                <circle r={12} fill="#4f46e5" opacity={0.15} />
                <text textAnchor="middle" y={-10} style={{ fill: 'var(--text-secondary)', fontSize: '8px', fontWeight: 600, pointerEvents: 'none' }}>
                  {coords.label}
                </text>
              </Marker>
            ))}

            {/* Attacker markers — bubble sized by hits */}
            {markers.map((m, i) => {
              const r = 3 + (m.hits / maxHits) * 8; // radius 3–11
              const isSelected = selectedOrigin === m.ip;
              return (
                <Marker key={m.ip} coordinates={[m.geo.lon, m.geo.lat]} onClick={() => setSelectedOrigin(isSelected ? null : m.ip)}>
                  <circle r={r} fill={isSelected ? 'var(--status-warning)' : 'var(--status-danger)'} opacity={0.8} style={{ cursor: 'pointer' }} />
                  {m.hits > 10 && (
                    <circle r={r + 4} fill="var(--status-danger)" opacity={0.12} />
                  )}
                </Marker>
              );
            })}
          </ComposableMap>

          {/* Map Legend */}
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-danger)', display: 'inline-block' }} /> Attacker (volume bubble)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} /> Server Hub</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-warning)', display: 'inline-block' }} /> Selected</span>
          </div>

          {/* Selected IP detail popup */}
          {selectedOrigin && attackerMap[selectedOrigin] && (() => {
            const atk = attackerMap[selectedOrigin];
            const geo = atk.geo || {};
            return (
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', minWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ color: 'var(--status-danger)', fontWeight: 600, fontSize: '0.62rem', textTransform: 'uppercase' }}>Attacker Profile</div>
                  <button onClick={() => setSelectedOrigin(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>{selectedOrigin}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {geo.country && <span>🌍 {geo.city ? `${geo.city}, ` : ''}{geo.country}</span>}
                  {geo.isp && <span>🏢 {geo.isp}</span>}
                  <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>⚡ {atk.hits} attempts</span>
                  {Array.from(atk.targets || []).length > 0 && (
                    <span>🎯 Targeting: {Array.from(atk.targets).join(', ')}</span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right sidebar: Country table + Top attackers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }} className="custom-scrollbar">
          
          {/* Top Countries */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.78rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Globe size={13} color="#8b5cf6" /> Top Origin Countries
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topCountries.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>No data yet…</div>}
              {topCountries.map((c, i) => {
                const barPct = Math.round((c.hits / (topCountries[0]?.hits || 1)) * 100);
                return (
                  <div key={c.country}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, width: '12px' }}>#{i + 1}</span>
                        {c.countryCode && <img src={`https://flagcdn.com/16x12/${c.countryCode.toLowerCase()}.png`} width="12" height="9" alt={c.countryCode} />}
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{c.country}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--status-danger)' }}>{c.hits.toLocaleString()}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{c.ips} IPs</span>
                      </div>
                    </div>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.02)', borderRadius: '1.5px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: i === 0 ? 'var(--status-danger)' : 'rgba(239,68,68,0.4)', borderRadius: '1.5px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Attacker IPs */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.78rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Activity size={13} color="var(--status-warning)" /> Top Attacking IPs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topAttackers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>No attacks detected.</div>}
              {topAttackers.map((atk, i) => {
                const geo = atk.geo || {};
                return (
                  <div
                    key={atk.ip}
                    onClick={() => setSelectedOrigin(selectedOrigin === atk.ip ? null : atk.ip)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: selectedOrigin === atk.ip ? 'rgba(251,191,36,0.02)' : 'rgba(255,255,255,0.01)',
                      border: `1px solid ${selectedOrigin === atk.ip ? 'rgba(251,191,36,0.2)' : 'var(--border-color)'}`,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 600 }}>{atk.ip}</div>
                      {geo.country && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                          {geo.countryCode && <img src={`https://flagcdn.com/16x12/${geo.countryCode.toLowerCase()}.png`} width="10" height="8" alt="" />}
                          {geo.city ? `${geo.city}, ` : ''}{geo.country}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--status-danger)' }}>{atk.hits}</div>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>attempts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-server target breakdown */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.78rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Server size={13} color="#06b6d4" /> Attacks Per Server
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(targetMap).sort((a, b) => b[1] - a[1]).map(([server, hits]) => (
                <div key={server} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{server}</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#06b6d4' }}>{hits.toLocaleString()} hits</span>
                </div>
              ))}
              {Object.keys(targetMap).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>No data.</div>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
