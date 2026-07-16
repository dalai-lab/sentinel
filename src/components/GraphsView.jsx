import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchServerMetricsRange } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';
import { Activity, Cpu, HardDrive, Wifi, RefreshCw, TrendingUp, TrendingDown, Minus, Maximize2, X } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

// ── Constants ────────────────────────────────────────────────────────────────
const TIME_RANGES = [
  { id: 3600,   label: '1H' },
  { id: 21600,  label: '6H' },
  { id: 86400,  label: '24H' },
  { id: 604800, label: '7D' },
];

const SERVERS = ['Oracle database server', 'Orbithyre', 'Gaplytiq', 'Dalai'];

const METRICS = [
  {
    id: 'cpu', label: 'CPU Usage', unit: '%', icon: Cpu,
    color: '#818cf8', gradStart: 'rgba(129,140,248,0.25)', gradEnd: 'rgba(129,140,248,0)',
    desc: 'Processor load across all cores',
    thresh: 85,
  },
  {
    id: 'mem', label: 'Memory', unit: '%', icon: Activity,
    color: '#34d399', gradStart: 'rgba(52,211,153,0.22)', gradEnd: 'rgba(52,211,153,0)',
    desc: 'RAM utilisation',
    thresh: 90,
  },
  {
    id: 'disk', label: 'Disk Usage', unit: '%', icon: HardDrive,
    color: '#fb923c', gradStart: 'rgba(251,146,60,0.22)', gradEnd: 'rgba(251,146,60,0)',
    desc: 'Root filesystem consumption',
    thresh: 90,
  },
  {
    id: 'netRecv', label: 'Network In', unit: 'B/s', icon: Wifi,
    color: '#38bdf8', gradStart: 'rgba(56,189,248,0.22)', gradEnd: 'rgba(56,189,248,0)',
    desc: 'Inbound bandwidth per server',
    thresh: null,
  },
];

const SERVER_COLORS = {
  'Oracle database server': '#818cf8',
  'Orbithyre':              '#34d399',
  'Gaplytiq':               '#fb923c',
  'Dalai':                  '#38bdf8',
};

function fmtBytes(v) {
  if (!v || isNaN(v)) return '0 B/s';
  if (v > 1e9) return (v / 1e9).toFixed(1) + ' GB/s';
  if (v > 1e6) return (v / 1e6).toFixed(1) + ' MB/s';
  if (v > 1e3) return (v / 1e3).toFixed(1) + ' KB/s';
  return v.toFixed(0) + ' B/s';
}

function fmtVal(v, unit) {
  if (unit === 'B/s') return fmtBytes(v);
  return `${parseFloat(v).toFixed(1)}${unit}`;
}

// ── Build per-metric chartData (all hosts merged into single timeline) ────────
function buildChartData(rawSeries, timeRange, serverFilter) {
  const timeMap = {};
  const hostsSet = new Set();

  (rawSeries || []).forEach(series => {
    const host = getFriendlyName(series.metric?.host_name);
    if (serverFilter !== 'all' && host !== serverFilter) return;
    hostsSet.add(host);
    series.values?.forEach(([ts, val]) => {
      const key = Math.floor(ts);
      if (!timeMap[key]) timeMap[key] = { rawTime: key };
      timeMap[key][host] = parseFloat(parseFloat(val).toFixed(3));
    });
  });

  const sorted = Object.values(timeMap).sort((a, b) => a.rawTime - b.rawTime);
  const formatted = sorted.map(d => {
    const date = new Date(d.rawTime * 1000);
    d.time = timeRange > 86400
      ? `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d;
  });

  return { data: formatted, hosts: Array.from(hostsSet) };
}

// ── Stat derivations ─────────────────────────────────────────────────────────
function computeStats(chartData, hosts) {
  if (!chartData.length || !hosts.length) return {};
  return Object.fromEntries(hosts.map(host => {
    const vals = chartData.map(d => d[host]).filter(v => v != null && !isNaN(v));
    if (!vals.length) return [host, null];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const peak = Math.max(...vals);
    const last = vals[vals.length - 1];
    const first = vals[0];
    const trend = last - first; // positive = rising
    return [host, { avg, peak, last, trend }];
  }));
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(12,12,18,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px', padding: '12px 16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)', minWidth: '180px',
    }}>
      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>{p.dataKey}</span>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{fmtVal(p.value, unit)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Single Metric Panel ────────────────────────────────────────────────────────
function MetricPanel({ metric, rawSeries, timeRange, serverFilter, onExpand, isExpanded }) {
  const { data: chartData, hosts } = useMemo(
    () => buildChartData(rawSeries, timeRange, serverFilter),
    [rawSeries, timeRange, serverFilter]
  );

  const stats = useMemo(() => computeStats(chartData, hosts), [chartData, hosts]);

  const Icon = metric.icon;
  const isEmpty = chartData.length === 0;

  // Fleet-level averages for the stat strip
  const fleetLast = hosts.length > 0
    ? hosts.reduce((acc, h) => acc + (stats[h]?.last || 0), 0) / hosts.filter(h => stats[h]).length
    : null;

  const fleetPeak = hosts.length > 0 ? Math.max(...hosts.map(h => stats[h]?.peak || 0)) : null;

  const fleetTrend = hosts.length > 0
    ? hosts.reduce((acc, h) => acc + (stats[h]?.trend || 0), 0) / hosts.filter(h => stats[h]).length
    : 0;

  const isCritical = metric.thresh && fleetLast > metric.thresh;
  const borderAccent = isCritical ? '#ef4444' : metric.color;

  return (
    <div style={{
      background: 'linear-gradient(145deg, #0d0f16, #111520)',
      border: `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderTop: `2px solid ${borderAccent}`,
      borderRadius: '14px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: isCritical ? '0 0 20px rgba(239,68,68,0.1)' : 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 120, height: 120, borderRadius: '50%',
        background: `radial-gradient(circle, ${metric.gradStart} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: `${metric.color}18`, border: `1px solid ${metric.color}30`, borderRadius: '8px', padding: '7px' }}>
            <Icon size={16} color={metric.color} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9' }}>{metric.label}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{metric.desc}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCritical && (
            <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)' }}>
              OVER THRESHOLD
            </div>
          )}
          <button onClick={onExpand} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {isExpanded ? <X size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Fleet-level stat strip */}
      {fleetLast != null && (
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Current Avg', value: fmtVal(fleetLast, metric.unit), color: metric.color },
            { label: 'Peak', value: fmtVal(fleetPeak, metric.unit), color: 'rgba(255,255,255,0.7)' },
            {
              label: 'Trend',
              value: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: fleetTrend > 0.5 ? '#f87171' : fleetTrend < -0.5 ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                  {fleetTrend > 0.5 ? <TrendingUp size={12} /> : fleetTrend < -0.5 ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {fleetTrend > 0 ? '+' : ''}{fmtVal(fleetTrend, metric.unit)}
                </span>
              ),
              color: 'rgba(255,255,255,0.7)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: isExpanded ? 340 : 160, position: 'relative' }}>
        {isEmpty ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>
            No data for selected range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                {hosts.map(host => {
                  const c = SERVER_COLORS[host] || metric.color;
                  return (
                    <linearGradient key={host} id={`grad-${metric.id}-${host.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                tickLine={false} axisLine={false} tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                tickLine={false} axisLine={false} tickMargin={4} width={40}
                tickFormatter={v => metric.unit === 'B/s' ? fmtBytes(v) : `${v}${metric.unit}`}
              />
              <Tooltip content={<CustomTooltip unit={metric.unit} />} />
              {metric.thresh && (
                <ReferenceLine y={metric.thresh} stroke="rgba(239,68,68,0.5)" strokeDasharray="4 4" strokeWidth={1} />
              )}
              {hosts.map(host => {
                const c = SERVER_COLORS[host] || metric.color;
                return (
                  <Area
                    key={host} type="monotoneX" dataKey={host}
                    stroke={c} strokeWidth={1.5}
                    fill={`url(#grad-${metric.id}-${host.replace(/\s/g, '')})`}
                    fillOpacity={1}
                    dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: c }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-server current values */}
      {hosts.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {hosts.map(host => {
            const s = stats[host];
            const c = SERVER_COLORS[host] || metric.color;
            if (!s) return null;
            return (
              <div key={host} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '4px 8px', border: `1px solid ${c}25` }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{host}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: metric.thresh && s.last > metric.thresh ? '#f87171' : '#fff' }}>
                  {fmtVal(s.last, metric.unit)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GraphsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(3600);
  const [serverFilter, setServerFilter] = useState('all');
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchServerMetricsRange(timeRange);
    if (result.success) {
      setData(result);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const visibleMetrics = expandedMetric ? METRICS.filter(m => m.id === expandedMetric) : METRICS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', paddingBottom: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color="var(--accent)" /> Telemetry Analytics
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Loading…'}
            {' · Auto-refreshes every 60s'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Time range pill buttons */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            {TIME_RANGES.map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                style={{
                  background: timeRange === t.id ? 'var(--accent)' : 'transparent',
                  border: 'none', color: timeRange === t.id ? '#fff' : 'rgba(255,255,255,0.45)',
                  padding: '7px 14px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Server filter */}
          <select
            value={serverFilter}
            onChange={e => setServerFilter(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', padding: '7px 12px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.82rem' }}
          >
            <option value="all">All Servers</option>
            {SERVERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button
            onClick={load}
            style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.82rem' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Server color legend ── */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {SERVERS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: SERVER_COLORS[s] }} />
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{s}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 24, height: 1, borderTop: '2px dashed rgba(239,68,68,0.5)' }} />
          <span style={{ fontSize: '0.72rem', color: 'rgba(239,68,68,0.7)' }}>Alert threshold</span>
        </div>
      </div>

      {/* ── Metric grid ── */}
      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: 'rgba(255,255,255,0.3)' }}>
          <RefreshCw size={20} className="spin" color="var(--accent)" />
          <span>Fetching telemetry data…</span>
        </div>
      )}

      {data && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: expandedMetric ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px',
          flex: 1,
          minHeight: 0,
        }}>
          {visibleMetrics.map(metric => (
            <MetricPanel
              key={metric.id}
              metric={metric}
              rawSeries={data[metric.id] || []}
              timeRange={timeRange}
              serverFilter={serverFilter}
              isExpanded={!!expandedMetric}
              onExpand={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
            />
          ))}
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
