import React from 'react';
import { Server, Cpu, HardDrive, Clock, ShieldCheck, ShieldAlert, ArrowDown, ArrowUp, Activity, Globe, CheckCircle, XCircle, Layers } from 'lucide-react';
import { fetchServerMetricsRange } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';

function formatNet(bytesPerSec) {
  if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec <= 0) return '0 B/s';
  const k = 1024, sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(k)), sizes.length - 1);
  return `${(bytesPerSec / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function uptime(s) {
  if (!s) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function metricColor(v) {
  const n = parseFloat(v) || 0;
  if (n > 85) return 'var(--status-danger)';
  if (n > 70) return 'var(--status-warning)';
  return 'var(--status-healthy)';
}

function HBar({ label, value, icon: Icon }) {
  const n = Math.min(parseFloat(value) || 0, 100);
  const c = metricColor(n);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
          <Icon size={11} color="var(--text-muted)" style={{ opacity: 0.8 }} /> {label}
        </div>
        <span style={{ fontSize: '0.74rem', fontWeight: 650, color: c }}>{n.toFixed(0)}%</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${n}%`, background: c, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function LargeSparkline({ cpuValues, ramValues, diskValues }) {
  if (!cpuValues || cpuValues.length === 0) return null;
  
  const width = 360;
  const height = 140;
  
  const getPoints = (vals) => {
    return vals.map((val, idx) => {
      const x = (idx / (vals.length - 1)) * width;
      // Fixed 0-100 scale mapping to graph height with 6px padding
      const y = height - 6 - (val / 100) * (height - 12);
      return `${x},${y}`;
    }).join(' ');
  };

  const cpuPoints = getPoints(cpuValues);
  const ramPoints = ramValues ? getPoints(ramValues) : null;
  const diskPoints = diskValues ? getPoints(diskValues) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Telemetry History</span>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.58rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--status-healthy)' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--status-healthy)' }} /> CPU
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#a78bfa' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa' }} /> RAM
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--status-warning)' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--status-warning)' }} /> Disk
          </span>
        </div>
      </div>
      <div style={{ height: '140px', position: 'relative', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '4px', overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.03)" strokeDasharray="1 3" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.03)" strokeDasharray="1 3" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="rgba(255,255,255,0.03)" strokeDasharray="1 3" />
          
          <polyline fill="none" stroke="var(--status-healthy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={cpuPoints} />
          {ramPoints && <polyline fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={ramPoints} />}
          {diskPoints && <polyline fill="none" stroke="var(--status-warning)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={diskPoints} />}
        </svg>
      </div>
    </div>
  );
}

const SERVER_DETAILS = {
  'Oracle database server': { ip: '80.225.241.81', host: 'instance-20260630-1713', role: 'Central Hub', services: ['SigNoz', 'Supabase', 'Sentinel Dashboard'], os: 'Ubuntu 22.04 LTS' },
  'Orbithyre':              { ip: '31.97.235.136', host: 'srv1213878', role: 'Web Server', services: ['OrbitHyre Platform'], os: 'Ubuntu 20.04 LTS' },
  'Gaplytiq':               { ip: '72.61.235.141', host: 'srv1176513', role: 'Web Server', services: ['Gaplytiq Platform'], os: 'Ubuntu 20.04 LTS' },
  'Dalai':                  { ip: '168.231.122.248', host: 'srv1055295', role: 'Web Server', services: ['Dalai.in Services'], os: 'Debian 11 Stable' },
};

const ROLE_COLORS = { 'Central Hub': '#8b5cf6', 'Web Server': '#06b6d4' };

export default function ServerList({ servers }) {
  const onlineCount = (servers || []).filter(s => s.status === 'online').length;
  const details = Object.entries(SERVER_DETAILS);

  // Keep sliding window of CPU, RAM, and Disk metrics in React state
  const [metricsHistory, setMetricsHistory] = React.useState({});

  // 1. Fetch historical range metrics (past 1 hour) on mount
  React.useEffect(() => {
    async function loadHistory() {
      const result = await fetchServerMetricsRange(3600); // 1 hour history
      if (result.success) {
        const historyMap = {};
        
        const processMetric = (seriesList, metricName) => {
          (seriesList || []).forEach(series => {
            const host = getFriendlyName(series.metric?.host_name);
            const values = (series.values || []).map(v => parseFloat(v[1]) || 0);
            
            if (!historyMap[host]) {
              historyMap[host] = { cpu: [], ram: [], disk: [] };
            }
            historyMap[host][metricName] = values;
          });
        };

        processMetric(result.cpu, 'cpu');
        processMetric(result.mem, 'ram');
        processMetric(result.disk, 'disk');

        setMetricsHistory(historyMap);
      }
    }
    loadHistory();
  }, []);

  // 2. Append new live metrics on tick (matching friendly name key)
  React.useEffect(() => {
    if (!servers || servers.length === 0) return;
    setMetricsHistory(prev => {
      const next = { ...prev };
      servers.forEach(s => {
        const matchedEntry = details.find(([name, info]) => s.ip === info.ip || s.name?.toLowerCase() === name.toLowerCase());
        if (!matchedEntry) return;
        const key = matchedEntry[0]; // e.g. "Oracle database server"
        
        const cpuVal = parseFloat(s.cpu) || 0;
        const ramVal = parseFloat(s.ram) || 0;
        const diskVal = parseFloat(s.disk) || 0;

        let current = next[key];
        if (!current) {
          current = {
            cpu: [cpuVal],
            ram: [ramVal],
            disk: [diskVal]
          };
        } else {
          current = {
            cpu: [...current.cpu, cpuVal].slice(-30), // keep last 30 values
            ram: [...current.ram, ramVal].slice(-30),
            disk: [...current.disk, diskVal].slice(-30)
          };
        }
        next[key] = current;
      });
      return next;
    });
  }, [servers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Server Fleet</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Live telemetry, system health, and inventory across {details.length} nodes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: `${details.length} Total Nodes`, color: 'var(--text-secondary)' },
            { label: `${onlineCount} Online`, color: 'var(--status-healthy)' },
            ...(details.length - onlineCount > 0 ? [{ label: `${details.length - onlineCount} Offline`, color: 'var(--status-danger)' }] : []),
          ].map(({ label, color }) => (
            <div key={label} style={{
              fontSize: '0.74rem',
              fontWeight: 500,
              color: color,
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-color)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)'
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Server cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!servers || servers.length === 0 || servers[0].status === 'connecting' || servers[0].status === 'gathering data...' ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="shimmer-card" style={{ height: '78px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '30%' }}>
                <div className="shimmer-bar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="shimmer-bar" style={{ width: '70%', height: '10px' }} />
                  <div className="shimmer-bar" style={{ width: '40%', height: '8px' }} />
                </div>
              </div>
              <div className="shimmer-bar" style={{ width: '15%', height: '12px' }} />
              <div className="shimmer-bar" style={{ width: '15%', height: '12px' }} />
              <div className="shimmer-bar" style={{ width: '15%', height: '12px' }} />
            </div>
          ))
        ) : (
          details.map(([name, info]) => {
          const live = (servers || []).find(s => s.ip === info.ip || s.name?.toLowerCase() === name.toLowerCase());
          const isOnline = live?.status === 'online';
          const isCrit = isOnline && (parseFloat(live?.cpu) > 85 || parseFloat(live?.ram) > 85 || parseFloat(live?.disk) > 85);
          const isWarn = isOnline && !isCrit && (parseFloat(live?.cpu) > 70 || parseFloat(live?.ram) > 70 || parseFloat(live?.disk) > 70);
          const roleColor = ROLE_COLORS[info.role] || '#818cf8';

          let borderColor = 'var(--border-color)';
          if (isOnline) {
            if (isCrit) { borderColor = 'rgba(239, 68, 68, 0.2)'; }
            else if (isWarn) { borderColor = 'rgba(245, 158, 11, 0.2)'; }
          }

          return (
            <div key={name} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'row',
              gap: '24px',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; }}
            >
              {/* Column 1: Details & Telemetry progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '340px', flexShrink: 0 }}>
                {/* Identity Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Server size={14} color="var(--text-secondary)" />
                    {isOnline && (
                      <span style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--status-healthy)',
                        border: '1px solid var(--bg-card)'
                      }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{name}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}><Globe size={10} />{info.ip}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '1px 6px', borderRadius: '3px', border: '1px solid var(--border-color)' }}>{info.os}</span>
                    </div>
                  </div>
                </div>

                {/* Telemetry Progress Bars */}
                {isOnline && live ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                    <HBar label="CPU Usage" value={live.cpu} icon={Cpu} />
                    <HBar label="Memory" value={live.ram} icon={Layers} />
                    <HBar label="Root Disk" value={live.disk} icon={HardDrive} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    <XCircle size={12} /> Host offline — no metrics
                  </div>
                )}
              </div>

              {/* Column 2: Large Telemetry Sparkline Graph */}
              {isOnline && live ? (
                <LargeSparkline 
                  cpuValues={metricsHistory[name]?.cpu || [parseFloat(live.cpu) || 0]} 
                  ramValues={metricsHistory[name]?.ram || [parseFloat(live.ram) || 0]} 
                  diskValues={metricsHistory[name]?.disk || [parseFloat(live.disk) || 0]} 
                />
              ) : (
                <div style={{ flex: 1, height: '140px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  No historical data
                </div>
              )}

              {/* Column 3: Stats, Services & Exporters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '260px', flexShrink: 0 }}>
                {/* Badges / Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: roleColor, background: `${roleColor}08`, border: `1px solid ${roleColor}20`, padding: '2px 8px', borderRadius: '4px' }}>
                    {info.role}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px' }}>
                    {isOnline ? 'Active' : 'Offline'}
                  </div>
                </div>

                {/* Sub-stats (Load / Uptime / Net) */}
                {isOnline && live && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {[
                      { label: 'Load', value: live.load || '—' },
                      { label: 'Uptime', value: uptime(live.uptime) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '4px 6px' }}>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '1px' }}>{label}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Services & exporter ports */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {info.services.map(svc => (
                      <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '2px 5px' }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>{svc}</span>
                      </div>
                    ))}
                  </div>
                  {isOnline && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[{ label: 'node', port: '9100' }, { label: 'otel', port: 'active' }].map(s => (
                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'monospace', padding: '1px 4px', borderRadius: '3px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                          <span>{s.label}</span>
                          <span style={{ color: 'var(--status-healthy)', fontWeight: 600 }}>{s.port}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}
