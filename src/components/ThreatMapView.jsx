import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { fetchRealLogs, fetchIpInfo } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';
import { isKnownCdn } from '../utils/logParsers';
import { Map, ShieldAlert, Globe, Activity, TrendingUp, Clock, Server, RefreshCw, Building, Zap, Target } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SERVER_LOCATIONS = {
  'Oracle database server': { lat: 19.0748, lon: 72.8856, label: 'Oracle DB' },
  'Orbithyre': { lat: 19.0848, lon: 72.9000, label: 'Orbithyre' },
  'Gaplytiq': { lat: 19.0648, lon: 72.8700, label: 'Gaplytiq' },
  'Dalai': { lat: 19.0900, lon: 72.8856, label: 'Dalai' }
};

const TIME_WINDOWS = [
  { id: 3600000, name: 'Last 1 Hour' },
  { id: 21600000, name: 'Last 6 Hours' },
  { id: 86400000, name: 'Last 24 Hours' },
];



export default function ThreatMapView() {
  const [logs, setLogs] = useState([]);
  const [geoData, setGeoData] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState(86400000);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    if (!loading && mapContainerRef.current) {
      const container = mapContainerRef.current;
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    }
  }, [loading]);

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
          // Filter out private/reserved IP ranges and known CDN providers (Cloudflare etc.)
          const isPrivate = ip.startsWith('10.') || ip.startsWith('192.168.')
            || /^172\.(1[6-9]|2\d|3[01])\./.test(ip); // only 172.16-31 are private
          if (!isPrivate && !isKnownCdn(ip)) {
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

  const targetMap = useMemo(() => {
    const m = {};
    logs.forEach(log => {
      const t = log.hostFriendly || 'Unknown';
      if (!m[t]) m[t] = 0;
      m[t] += 1;
    });
    return m;
  }, [logs]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', paddingBottom: '20px', animation: 'fadeIn 0.4s ease' }}>
      
      {/* Header */}
      <div className="threat-header">
        <div className="threat-breadcrumbs">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Security</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Threat Map</span>
        </div>
        
        <div className="threat-title-row">
          <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <Map size={14} color="var(--text-muted)" /> Threat Intelligence Map
          </h2>
        </div>

        <div className="threat-header-actions">
          <select
            value={timeWindow}
            onChange={e => setTimeWindow(parseInt(e.target.value))}
            style={{ background: 'var(--color-rgb-255-255-255-0-02)', border: '1px solid var(--color-rgb-255-255-255-0-03)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', outline: 'none', cursor: 'pointer', fontSize: '0.74rem' }}
          >
            {TIME_WINDOWS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={loadThreats} style={{ background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)', padding: '5px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '0.72rem' }}>
            <RefreshCw size={11} className={loading ? 'spin' : ''} /> <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Fleet Overview Stat Strip (Overview design style: unified cells separated by gap: 1px) */}
      <div className="threat-stats-grid">
        {[
          { icon: ShieldAlert, label: 'Total Attempts', value: totalAttacks.toLocaleString(), color: 'var(--status-danger)', sub: 'blocked by SSH' },
          { icon: Globe, label: 'Unique Attackers', value: uniqueIPs.toLocaleString(), color: 'var(--status-warning)', sub: 'distinct IPs' },
          { icon: TrendingUp, label: 'Top Origin', value: topCountry, color: 'var(--color-hex-8b5cf6)', sub: topCountries[0] ? `${topCountries[0].hits} attempts` : 'no origin logs' },
          { icon: Server, label: 'Most Targeted', value: mostTargeted, color: 'var(--color-hex-06b6d4)', sub: targetMap[mostTargeted] ? `${targetMap[mostTargeted]} hits` : 'no target logs' },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} style={{ padding: '20px 24px', background: 'var(--color-rgb-255-255-255-0-003)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
              <Icon size={14} color={color} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', width: '100%', overflow: 'hidden' }}>
              <span className="threat-stat-value" title={value}>
                {value}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Main Content: Full-Container Map with Floating Analytics Overlays */}
      {loading && logs.length === 0 ? (
        <div className="shimmer-card" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }} />
      ) : (
        <div className="threat-map-container" ref={mapContainerRef}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-rgb-9-9-11-0-6)', zIndex: 20 }}>
              <RefreshCw size={20} className="spin" color="var(--text-primary)" />
            </div>
          )}

          {/* Map Layer */}
          <div className="threat-map-scrollable">
            <ComposableMap projectionConfig={{ scale: 190, center: [10, 15] }} style={{ width: '100%', height: '100%' }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="var(--color-rgb-255-255-255-0-015)"
                      stroke="var(--color-rgb-255-255-255-0-04)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: 'var(--color-rgb-255-255-255-0-035)', outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>
  
              {/* Server target markers */}
              {Object.entries(SERVER_LOCATIONS).map(([name, coords]) => (
                <Marker key={name} coordinates={[coords.lon, coords.lat]}>
                  <circle r={4} fill="var(--color-hex-818cf8)" />
                  <circle r={10} fill="var(--color-hex-818cf8)" opacity={0.12} />
                  <text textAnchor="middle" y={-9} style={{ fill: 'var(--text-secondary)', fontSize: '7px', fontWeight: 500, pointerEvents: 'none' }}>
                    {coords.label}
                  </text>
                </Marker>
              ))}
  
              {/* Attacker markers */}
              {markers.map((m, i) => {
                const r = 3 + (m.hits / maxHits) * 7;
                const isSelected = selectedOrigin === m.ip;
                return (
                  <Marker key={m.ip} coordinates={[m.geo.lon, m.geo.lat]} onClick={() => setSelectedOrigin(isSelected ? null : m.ip)}>
                    <circle r={r} fill={isSelected ? 'var(--status-warning)' : 'var(--status-danger)'} opacity={0.7} style={{ cursor: 'pointer' }} />
                    {m.hits > 10 && (
                      <circle r={r + 3} fill="var(--status-danger)" opacity={0.08} />
                    )}
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>

          {/* FLOATING OVERLAY: Top Countries (Top Right) */}
          <div className="threat-overlay countries-overlay">
            <div style={{ fontWeight: 500, fontSize: '0.74rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Globe size={12} color="var(--color-hex-8b5cf6)" /> Top Origin Countries
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topCountries.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>No data yet…</div>}
              {topCountries.map((c, i) => {
                const barPct = Math.round((c.hits / (topCountries[0]?.hits || 1)) * 100);
                return (
                  <div key={c.country}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>#{i + 1}</span>
                        {c.countryCode && <img src={`https://flagcdn.com/16x12/${c.countryCode.toLowerCase()}.png`} width="12" height="9" alt={c.countryCode} />}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{c.country}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--status-danger)' }}>{c.hits.toLocaleString()}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: '3px' }}>{c.ips} IPs</span>
                      </div>
                    </div>
                    <div style={{ height: '2px', background: 'var(--color-rgb-255-255-255-0-02)', borderRadius: '1px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: i === 0 ? 'var(--status-danger)' : 'var(--color-rgb-239-68-68-0-4)', borderRadius: '1px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FLOATING OVERLAY: Top Attacker IPs (Bottom Right) */}
          <div className="threat-overlay attackers-overlay">
            <div style={{ fontWeight: 500, fontSize: '0.74rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Activity size={12} color="var(--status-warning)" /> Top Attacking IPs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '160px', overflowY: 'auto' }} className="custom-scrollbar">
              {topAttackers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>No attacks detected.</div>}
              {topAttackers.map((atk, i) => {
                const geo = atk.geo || {};
                return (
                  <div
                    key={atk.ip}
                    onClick={() => setSelectedOrigin(selectedOrigin === atk.ip ? null : atk.ip)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: selectedOrigin === atk.ip ? 'var(--color-rgb-251-191-36-0-02)' : 'var(--color-rgb-255-255-255-0-006)',
                      border: `1px solid ${selectedOrigin === atk.ip ? 'var(--color-rgb-251-191-36-0-15)' : 'var(--color-rgb-255-255-255-0-015)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-primary)', fontWeight: 500 }}>{atk.ip}</div>
                      {geo.country && (
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                          {geo.countryCode && <img src={`https://flagcdn.com/16x12/${geo.countryCode.toLowerCase()}.png`} width="10" height="8" alt="" />}
                          {geo.city ? `${geo.city}, ` : ''}{geo.country}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--status-danger)' }}>{atk.hits}</div>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>attempts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FLOATING OVERLAY: Attacks Per Server (Bottom Left) */}
          <div className="threat-overlay targets-overlay">
            <div style={{ fontWeight: 500, fontSize: '0.74rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Server size={12} color="var(--color-hex-06b6d4)" /> Target Distribution
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(targetMap).sort((a, b) => b[1] - a[1]).map(([server, hits]) => (
                <div key={server} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--color-rgb-255-255-255-0-015)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{server}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-hex-06b6d4)' }}>{hits.toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(targetMap).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>No data.</div>}
            </div>

            {/* Map Legend inline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-rgb-255-255-255-0-03)', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-danger)', display: 'inline-block' }} /> Attack Source</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-hex-818cf8)', display: 'inline-block' }} /> Server Target</span>
            </div>
          </div>

          {/* Selected IP Profile Overlay (Top Left) */}
          {selectedOrigin && attackerMap[selectedOrigin] && (() => {
            const atk = attackerMap[selectedOrigin];
            const geo = atk.geo || {};
            return (
              <div className="threat-overlay selected-overlay">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ color: 'var(--status-danger)', fontWeight: 650, fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Selected Target</div>
                  <button onClick={() => setSelectedOrigin(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem', marginBottom: '6px' }}>{selectedOrigin}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {geo.country && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={11} color="var(--text-muted)" /> {geo.city ? `${geo.city}, ` : ''}{geo.country}
                    </span>
                  )}
                  {geo.isp && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={11} color="var(--text-muted)" /> {geo.isp}
                    </span>
                  )}
                  <span style={{ color: 'var(--status-danger)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={11} color="var(--status-danger)" /> {atk.hits} attempts
                  </span>
                  {Array.from(atk.targets || []).length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={11} color="var(--text-muted)" /> Targeting: {Array.from(atk.targets).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
  
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        button:hover { opacity: 0.95; }
      `}</style>
    </div>
  );
}
