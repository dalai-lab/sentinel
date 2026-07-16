import React from 'react';
import { Server, Cpu, HardDrive, Clock, ShieldCheck, ShieldAlert, ArrowDown, ArrowUp, Activity, Globe, CheckCircle, XCircle, Layers } from 'lucide-react';
import { fetchServerMetricsRange } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

function SparklineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#09090b',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 'var(--radius-sm)',
      padding: '6px 10px',
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.7)',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px'
    }}>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '2px' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: p.color }} />
            {p.name}
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-primary)' }}>{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function LargeSparkline({ cpuValues, ramValues, diskValues }) {
  if (!cpuValues || cpuValues.length === 0) return null;

  const chartData = React.useMemo(() => {
    return cpuValues.map((item, idx) => {
      const date = new Date(item.ts || Date.now());
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        time: timeStr,
        CPU: item.val || 0,
        RAM: ramValues?.[idx]?.val ?? 0,
        Disk: diskValues?.[idx]?.val ?? 0,
      };
    });
  }, [cpuValues, ramValues, diskValues]);

  return (
    <div className="server-sparkline-container">
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
      <div style={{ height: '140px', position: 'relative', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px', overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id="sparklineCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--status-healthy)" stopOpacity={0.16}/>
                <stop offset="95%" stopColor="var(--status-healthy)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="sparklineRam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.16}/>
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="sparklineDisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--status-warning)" stopOpacity={0.16}/>
                <stop offset="95%" stopColor="var(--status-warning)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide={true} />
            <YAxis domain={[0, 100]} hide={true} />
            <Tooltip content={<SparklineTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="CPU" stroke="var(--status-healthy)" fill="url(#sparklineCpu)" strokeWidth={1.8} style={{ filter: 'drop-shadow(0px 2px 4px var(--status-healthy)30)' }} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="RAM" stroke="#a78bfa" fill="url(#sparklineRam)" strokeWidth={1.8} style={{ filter: 'drop-shadow(0px 2px 4px #a78bfa30)' }} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Disk" stroke="var(--status-warning)" fill="url(#sparklineDisk)" strokeWidth={1.8} style={{ filter: 'drop-shadow(0px 2px 4px var(--status-warning)30)' }} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
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

export default function ServerList({ servers, onSelectServer }) {
  const onlineCount = (servers || []).filter(s => s.status === 'online').length;
  const details = Object.entries(SERVER_DETAILS);

  const [metricsHistory, setMetricsHistory] = React.useState({});

  React.useEffect(() => {
    async function loadHistory() {
      const result = await fetchServerMetricsRange(3600);
      if (result.success) {
        const historyMap = {};
        
        const processMetric = (seriesList, metricName) => {
          (seriesList || []).forEach(series => {
            const host = getFriendlyName(series.metric?.host_name);
            const values = (series.values || []).map(v => ({
              val: parseFloat(v[1]) || 0,
              ts: parseFloat(v[0]) * 1000
            }));
            
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

  React.useEffect(() => {
    if (!servers || servers.length === 0) return;
    setMetricsHistory(prev => {
      const next = { ...prev };
      servers.forEach(s => {
        const matchedEntry = details.find(([name, info]) => s.ip === info.ip || s.name?.toLowerCase() === name.toLowerCase());
        if (!matchedEntry) return;
        const key = matchedEntry[0];
        
        const cpuVal = parseFloat(s.cpu) || 0;
        const ramVal = parseFloat(s.ram) || 0;
        const diskVal = parseFloat(s.disk) || 0;
        const now = Date.now();

        let current = next[key];
        if (!current) {
          current = {
            cpu: [{ val: cpuVal, ts: now }],
            ram: [{ val: ramVal, ts: now }],
            disk: [{ val: diskVal, ts: now }]
          };
        } else {
          current = {
            cpu: [...current.cpu, { val: cpuVal, ts: now }].slice(-30),
            ram: [...current.ram, { val: ramVal, ts: now }].slice(-30),
            disk: [...current.disk, { val: diskVal, ts: now }].slice(-30)
          };
        }
        next[key] = current;
      });
      return next;
    });
  }, [servers]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
      
      {/* Page Header */}
      <div className="server-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Infrastructure</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
          <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>Server Fleet</h2>
        </div>
        <div className="server-list-header-badges">
          {[
            { label: `${details.length} Total Nodes`, color: 'var(--text-secondary)' },
            { label: `${onlineCount} Online`, color: 'var(--status-healthy)' },
            ...(details.length - onlineCount > 0 ? [{ label: `${details.length - onlineCount} Offline`, color: 'var(--status-danger)' }] : []),
          ].map(({ label, color }) => (
            <div key={label} style={{
              fontSize: '0.7rem',
              fontWeight: 500,
              color: color,
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.02)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)'
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Server Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!servers || servers.length === 0 || servers[0].status === 'connecting' || servers[0].status === 'gathering data...' ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="shimmer-card" style={{ height: '110px' }} />
          ))
        ) : (
          details.map(([name, info]) => {
            const live = (servers || []).find(s => s.ip === info.ip || s.name?.toLowerCase() === name.toLowerCase());
            const isOnline = live?.status === 'online';
            const isCrit = isOnline && (parseFloat(live?.cpu) > 85 || parseFloat(live?.ram) > 85 || parseFloat(live?.disk) > 85);
            const isWarn = isOnline && !isCrit && (parseFloat(live?.cpu) > 70 || parseFloat(live?.ram) > 70 || parseFloat(live?.disk) > 70);
            const roleColor = ROLE_COLORS[info.role] || '#818cf8';

            let borderColor = 'rgba(255,255,255,0.03)';
            if (isOnline) {
              if (isCrit) { borderColor = 'rgba(239, 68, 68, 0.15)'; }
              else if (isWarn) { borderColor = 'rgba(245, 158, 11, 0.15)'; }
            }

            return (
              <div key={name} className="server-row-container" style={{ borderColor }}
                onClick={() => onSelectServer && onSelectServer(name)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.background = 'rgba(255,255,255,0.005)'; }}
              >
                {/* Column 1: Details & Telemetry Progress Bars */}
                <div className="server-row-col1">
                  {/* Identity Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255,255,255,0.02)',
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
                          border: '1px solid #09090b'
                        }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{name}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}><Globe size={10} />{info.ip}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.02)' }}>{info.os}</span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Progress Bars */}
                  {isOnline && live ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <HBar label="CPU Usage" value={live.cpu} icon={Cpu} />
                      <HBar label="Memory" value={live.ram} icon={Layers} />
                      <HBar label="Root Disk" value={live.disk} icon={HardDrive} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      <XCircle size={12} /> Host offline — no metrics
                    </div>
                  )}
                </div>

                {/* Column 2: Large Telemetry Sparkline Graph */}
                {isOnline && live ? (
                  <LargeSparkline 
                    cpuValues={metricsHistory[name]?.cpu || [{ val: parseFloat(live.cpu) || 0, ts: Date.now() }]} 
                    ramValues={metricsHistory[name]?.ram || [{ val: parseFloat(live.ram) || 0, ts: Date.now() }]} 
                    diskValues={metricsHistory[name]?.disk || [{ val: parseFloat(live.disk) || 0, ts: Date.now() }]} 
                  />
                ) : (
                  <div style={{ flex: 1, height: '140px', border: '1px dashed rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    No historical data
                  </div>
                )}

                {/* Column 3: Stats, Services & Exporters */}
                <div className="server-row-col3">
                  {/* Badges / Header info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 500, color: roleColor, background: `${roleColor}08`, border: `1px solid ${roleColor}15`, padding: '2px 8px', borderRadius: '4px' }}>
                      {info.role}
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 500, color: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '2px 8px', borderRadius: '4px' }}>
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
                        <div key={label} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '4px 6px' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 650, display: 'block', marginBottom: '1px' }}>{label}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Services & Exporter Ports */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {info.services.map(svc => (
                        <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '3px', padding: '2px 6px' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)', display: 'inline-block' }} />
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>{svc}</span>
                        </div>
                      ))}
                    </div>
                    {isOnline && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[{ label: 'node', port: '9100' }, { label: 'otel', port: 'active' }].map(s => (
                          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'monospace', padding: '1px 4px', borderRadius: '3px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
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
          })
        )}
      </div>
    </div>
  );
}
