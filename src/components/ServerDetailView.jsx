import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Cpu, MemoryStick, HardDrive, Network, Clock,
  ShieldAlert, ShieldCheck, RefreshCw, Globe, Activity,
  Wifi, Terminal, Server
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { fetchServerMetrics, fetchServerMetricsRange, fetchServerFullSpecs, fetchPerCoreUsage } from '../api/signoz';
import { fetchAlerts } from '../api/alerts';

// ── Canonical host lookup ─────────────────────────────────────────────────────
const NAME_TO_HOST = {
  'Oracle database server': 'instance-20260630-1713',
  'Orbithyre':              'srv1213878',
  'Gaplytiq':               'srv1176513',
  'Dalai':                  'srv1055295'
};
const HOST_TO_IP = {
  'instance-20260630-1713': '80.225.241.81',
  'srv1213878':             '31.97.235.136',
  'srv1176513':             '72.61.235.141',
  'srv1055295':             '168.231.122.248'
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtGB = (bytes) => {
  if (bytes == null || isNaN(bytes)) return '—';
  const gb = bytes / (1024 ** 3);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
};
const fmtBps = (v) => {
  if (v == null || isNaN(v)) return '—';
  if (v > 1e9) return `${(v / 1e9).toFixed(1)} GB/s`;
  if (v > 1e6) return `${(v / 1e6).toFixed(1)} MB/s`;
  if (v > 1e3) return `${(v / 1e3).toFixed(1)} KB/s`;
  return `${Number(v).toFixed(0)} B/s`;
};
const fmtPct = (v) => (v == null || isNaN(v)) ? '—' : `${parseFloat(v).toFixed(0)}%`;
const fmtNum = (v, d = 0) => (v == null || isNaN(v)) ? '—' : parseFloat(v).toFixed(d);
const fmtUptime = (s) => {
  if (!s || s <= 0) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Prometheus helpers ────────────────────────────────────────────────────────
const extractMetric = (arr, host) => {
  if (!Array.isArray(arr)) return null;
  const m = arr.find(r => r.metric?.host_name === host);
  return m ? parseFloat(m.value?.[1]) : null;
};

const buildSeries = (arr, host, key, pts) => {
  const out = { ...pts };
  if (!Array.isArray(arr)) return out;
  const m = arr.find(r => r.metric?.host_name === host);
  if (!m) return out;
  (m.values || []).forEach(([ts, val]) => {
    const t = Number(ts);
    const ex = out[t] ? { ...out[t] } : { ts: t, time: new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    ex[key] = parseFloat(val) || 0;
    out[t] = ex;
  });
  return out;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ServerDetailView({ serverName, onBack }) {
  const targetHost = NAME_TO_HOST[serverName] || serverName;
  const serverIp   = HOST_TO_IP[targetHost] || '—';

  const [live,        setLive]        = useState(null);
  const [specs,       setSpecs]       = useState(null);
  const [perCore,     setPerCore]     = useState([]);
  const [chartPoints, setChartPoints] = useState({});
  const [alerts,      setAlerts]      = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [chartLoading,setChartLoading]= useState(true);
  const [specsLoading,setSpecsLoading]= useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchLive(), fetchCores(), fetchSpecsData(), fetchHistory(), fetchServerAlerts()]);
    setIsRefreshing(false);
  };

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetchServerMetrics();
      if (!r.success) return;
      setLive({
        cpu:     extractMetric(r.cpu,     targetHost),
        ram:     extractMetric(r.mem,     targetHost),
        disk:    extractMetric(r.disk,    targetHost),
        uptime:  extractMetric(r.uptime,  targetHost),
        load1:   extractMetric(r.load,    targetHost),
        netRecv: extractMetric(r.netRecv, targetHost),
        netSent: extractMetric(r.netSent, targetHost)
      });
      setLastUpdated(new Date());
    } catch (e) { console.error('[Detail] live', e); }
    finally { setLiveLoading(false); }
  }, [targetHost]);

  const fetchCores = useCallback(async () => {
    const cores = await fetchPerCoreUsage(targetHost);
    setPerCore(cores);
  }, [targetHost]);

  const fetchSpecsData = useCallback(async () => {
    setSpecsLoading(true);
    const s = await fetchServerFullSpecs(targetHost);
    setSpecs(s);
    setSpecsLoading(false);
  }, [targetHost]);

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetchServerMetricsRange(3600);
      if (!r.success) return;
      setChartPoints(prev => {
        let p = { ...prev };
        p = buildSeries(r.cpu,     targetHost, 'cpu',    p);
        p = buildSeries(r.mem,     targetHost, 'ram',    p);
        p = buildSeries(r.disk,    targetHost, 'disk',   p);
        p = buildSeries(r.netRecv, targetHost, 'netIn',  p);
        p = buildSeries(r.netSent, targetHost, 'netOut', p);
        return p;
      });
    } catch (e) { console.error('[Detail] history', e); }
    finally { setChartLoading(false); }
  }, [targetHost]);

  const fetchServerAlerts = useCallback(async () => {
    try {
      const all = await fetchAlerts();
      const seen = new Set();
      setAlerts(all.filter(a => {
        if (a.host !== serverName || a.status !== 'active') return false;
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      }));
    } catch { setAlerts([]); }
  }, [serverName]);

  useEffect(() => {
    fetchLive(); fetchCores(); fetchSpecsData(); fetchHistory(); fetchServerAlerts();
    const t1 = setInterval(fetchLive,         15000);
    const t2 = setInterval(fetchCores,        15000);
    const t3 = setInterval(fetchHistory,      60000);
    const t4 = setInterval(fetchServerAlerts, 30000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); };
  }, [fetchLive, fetchCores, fetchSpecsData, fetchHistory, fetchServerAlerts]);

  const chartData = useMemo(() =>
    Object.values(chartPoints).sort((a, b) => a.ts - b.ts), [chartPoints]);

  const isOnline = live !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
      
      {/* ── Breadcrumb Navigation & Control ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={backBtnStyle} aria-label="Go Back">
            <ArrowLeft size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Infrastructure</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
            <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {serverName}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 500, color: isOnline ? 'var(--status-healthy)' : 'var(--status-danger)' }}>
                <span className={`status-pulse ${isOnline ? 'online' : 'offline'}`} />
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </h2>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button 
            onClick={triggerRefresh} 
            style={actionBtnStyle}
            disabled={isRefreshing}
          >
            <RefreshCw size={12} className={isRefreshing ? 'spin-animation' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Real-Time Hero Vitals Row ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
        {[
          {
            label: 'CPU Utilization',
            value: fmtPct(live?.cpu),
            subtext: live?.load1 ? `Load: ${fmtNum(live.load1, 2)}` : 'No load data',
            color: 'var(--status-healthy)',
            icon: Cpu
          },
          {
            label: 'Memory Active',
            value: fmtPct(live?.ram),
            subtext: specs?.memTotal && live?.ram ? `${fmtGB((live.ram / 100) * specs.memTotal)} of ${fmtGB(specs.memTotal)}` : 'No specs loaded',
            color: '#a78bfa',
            icon: MemoryStick
          },
          {
            label: 'Storage Used',
            value: fmtPct(live?.disk),
            subtext: specs?.diskTotal && live?.disk ? `${fmtGB((live.disk / 100) * specs.diskTotal)} of ${fmtGB(specs.diskTotal)}` : 'No disk specs',
            color: '#38bdf8',
            icon: HardDrive
          },
          {
            label: 'Network I/O',
            value: live ? fmtBps(live.netRecv + live.netSent) : '—',
            subtext: live ? `↑ ${fmtBps(live.netSent)}  ↓ ${fmtBps(live.netRecv)}` : 'Inactive',
            color: '#f59e0b',
            icon: Wifi
          }
        ].map((vital, i) => {
          const Icon = vital.icon;
          return (
            <div key={vital.label} style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.003)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{vital.label}</span>
                <Icon size={14} color="var(--text-muted)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {vital.value}
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{vital.subtext}</span>
            </div>
          );
        })}
      </div>

      {/* ── Main Dual-Pane Workspace ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Workspace: Telemetry Graphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {chartLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="shimmer-card" style={{ height: '220px' }} />
              <div className="shimmer-card" style={{ height: '220px' }} />
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
              No telemetry range history found. Node Exporter may be offline.
            </div>
          ) : (
            <>
              <PremiumChartCard 
                title="Processor & Memory Load" 
                legends={[
                  { label: 'CPU Utilization', color: 'var(--status-healthy)' },
                  { label: 'RAM Utilization', color: '#a78bfa' }
                ]}
              >
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-healthy)" stopOpacity={0.06}/>
                      <stop offset="95%" stopColor="var(--status-healthy)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ramGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.06}/>
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.015)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomChartTooltip suffix="%" />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="cpu" name="CPU" stroke="var(--status-healthy)" fill="url(#cpuGlow)" strokeWidth={1.2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="ram" name="RAM" stroke="#a78bfa" fill="url(#ramGlow)" strokeWidth={1.2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </PremiumChartCard>

              <PremiumChartCard 
                title="Network Throughput" 
                legends={[
                  { label: 'Inbound', color: '#38bdf8' },
                  { label: 'Outbound', color: '#f59e0b' }
                ]}
              >
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netInGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.06}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="netOutGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.06}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.015)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={fmtBps} />
                  <Tooltip content={<CustomChartTooltip formatter={fmtBps} />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="netIn" name="Inbound" stroke="#38bdf8" fill="url(#netInGlow)" strokeWidth={1.2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="netOut" name="Outbound" stroke="#f59e0b" fill="url(#netOutGlow)" strokeWidth={1.2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </PremiumChartCard>
            </>
          )}
        </div>

        {/* Right Workspace: Meta, Specs & Incidents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Incidents Banner */}
          <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Alerts</span>
            {alerts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--status-healthy)', fontWeight: 500 }}>
                <ShieldCheck size={14} />
                No active health anomalies
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {alerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.1)',
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                    fontSize: '0.72rem', color: 'var(--status-danger)'
                  }}>
                    <ShieldAlert size={12} />
                    <span style={{ fontWeight: 500 }}>[{a.severity?.toUpperCase()}]</span>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>{a.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Micro CPU Threads Visualizer */}
          {perCore.length > 0 && (
            <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Logical Thread Map</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{perCore.length} Cores</span>
              </div>
              
              {/* Dense Horizontal Core strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {perCore.map(({ cpu, usage }) => {
                  const intensity = Math.min(100, Math.max(0, usage)) / 100;
                  const coreColor = usage > 85 ? 'rgba(239,68,68,0.8)' : usage > 65 ? 'rgba(245,158,11,0.8)' : 'rgba(16,185,129,0.8)';
                  return (
                    <div 
                      key={cpu} 
                      style={{ 
                        padding: '6px 8px', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid rgba(255,255,255,0.02)', 
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px' 
                      }}
                      title={`Core ${cpu}: ${usage.toFixed(0)}%`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <span>C{cpu}</span>
                        <span style={{ color: coreColor, fontWeight: 600 }}>{usage.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.03)', borderRadius: '1.5px', overflow: 'hidden' }}>
                        <div style={{ width: `${usage}%`, height: '100%', background: coreColor, borderRadius: '1.5px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Identity & Metadata */}
          <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Parameters</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'OS Distribution', value: specs?.osName || '—' },
                { label: 'Kernel Version', value: specs?.kernelVersion || '—', isCode: true },
                { label: 'IP Address', value: serverIp, isCode: true },
                { label: 'Uptime', value: live ? fmtUptime(live.uptime) : '—' },
                { label: 'System Load Average', value: live?.load1 ? `${fmtNum(live.load1, 2)} (1m) · ${fmtNum(specs?.load5, 2)} (5m)` : '—' },
                { label: 'CPU Specs', value: specs?.cpuModelName ? `${specs.cpuModelName} (${specs.cpuCores || perCore.length}T)` : '—' }
              ].map((spec) => (
                <div key={spec.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(255,255,255,0.015)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{spec.label}</span>
                  <span style={{ 
                    fontSize: '0.74rem', 
                    fontWeight: 500, 
                    color: 'var(--text-secondary)',
                    fontFamily: spec.isCode ? 'var(--font-mono, monospace)' : 'inherit',
                    letterSpacing: spec.isCode ? '-0.02em' : 'normal',
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={spec.value}>
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

// ── Custom Styled Subcomponents ────────────────────────────────────────────────
function PremiumChartCard({ title, legends = [], children }) {
  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.005)', 
      border: '1px solid rgba(255,255,255,0.03)', 
      borderRadius: 'var(--radius-md)', 
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.76rem', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>{title}</h4>
        <div style={{ display: 'flex', gap: '14px' }}>
          {legends.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: '200px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomChartTooltip({ active, payload, label, suffix = '', formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ 
      background: '#09090b', 
      border: '1px solid rgba(255,255,255,0.05)', 
      borderRadius: 'var(--radius-sm)', 
      padding: '8px 12px', 
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.7)',
      minWidth: '120px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{p.name}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: p.color }}>
            {formatter ? formatter(p.value) : `${p.value}${suffix}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Inline Styles ─────────────────────────────────────────────────────────────
const backBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  padding: '6px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.2s ease, background-color 0.2s ease',
  outline: 'none',
  ':hover': {
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(255,255,255,0.03)'
  }
};

const actionBtnStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.03)',
  color: 'var(--text-secondary)',
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.72rem',
  fontWeight: 500,
  transition: 'all 0.2s ease'
};
