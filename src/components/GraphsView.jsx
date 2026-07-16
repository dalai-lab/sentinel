import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchServerMetricsRange } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';
import { Activity, Cpu, HardDrive, Wifi, RefreshCw, TrendingUp, TrendingDown, Minus, Maximize2, X, ArrowLeft } from 'lucide-react';
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
    color: 'var(--status-healthy)',
    desc: 'Processor load across all active servers',
    thresh: 85,
  },
  {
    id: 'mem', label: 'Memory Usage', unit: '%', icon: Activity,
    color: 'var(--color-hex-a78bfa)',
    desc: 'RAM utilisation across fleet',
    thresh: 90,
  },
  {
    id: 'disk', label: 'Disk Usage', unit: '%', icon: HardDrive,
    color: 'var(--color-hex-38bdf8)',
    desc: 'Root filesystem consumption',
    thresh: 90,
  },
  {
    id: 'netRecv', label: 'Network In', unit: 'B/s', icon: Wifi,
    color: 'var(--color-hex-38bdf8)',
    desc: 'Inbound bandwidth per server',
    thresh: null,
  },
  {
    id: 'netSent', label: 'Network Out', unit: 'B/s', icon: Wifi,
    color: 'var(--color-hex-f59e0b)',
    desc: 'Outbound bandwidth per server',
    thresh: null,
  },
];

const SERVER_COLORS = {
  'Oracle database server': 'var(--status-healthy)',
  'Orbithyre':              'var(--color-hex-a78bfa)',
  'Gaplytiq':               'var(--color-hex-38bdf8)',
  'Dalai':                  'var(--color-hex-f59e0b)',
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

// ── Build per-metric chartData ───────────────────────────────────────────────
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
    const trend = last - first;
    return [host, { avg, peak, last, trend }];
  }));
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-hex-09090b)',
      border: '1px solid var(--color-rgb-255-255-255-0-05)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      boxShadow: '0 10px 30px -10px var(--color-rgb-0-0-0-0-7)',
      minWidth: '150px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{p.dataKey}</span>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtVal(p.value, unit)}</span>
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

  const fleetLast = hosts.length > 0
    ? hosts.reduce((acc, h) => acc + (stats[h]?.last || 0), 0) / hosts.filter(h => stats[h]).length
    : null;

  const fleetPeak = hosts.length > 0 ? Math.max(...hosts.map(h => stats[h]?.peak || 0)) : null;

  const fleetTrend = hosts.length > 0
    ? hosts.reduce((acc, h) => acc + (stats[h]?.trend || 0), 0) / hosts.filter(h => stats[h]).length
    : 0;

  const isCritical = metric.thresh && fleetLast > metric.thresh;

  return (
    <div style={{
      background: 'var(--color-rgb-255-255-255-0-005)',
      border: isCritical ? '1px solid var(--color-rgb-239-68-68-0-15)' : '1px solid var(--color-rgb-255-255-255-0-03)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative'
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            <Icon size={14} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{metric.label}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{metric.desc}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCritical && (
            <span style={{ background: 'var(--color-rgb-239-68-68-0-05)', border: '1px solid var(--color-rgb-239-68-68-0-2)', color: 'var(--status-danger)', fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Warning Thresh
            </span>
          )}
          <button onClick={onExpand} style={panelBtnStyle} aria-label="Toggle Expand" className="graphs-expand-btn">
            {isExpanded ? <X size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Fleet-level stats row */}
      {fleetLast != null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--color-rgb-255-255-255-0-03)', border: '1px solid var(--color-rgb-255-255-255-0-03)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {[
            { label: 'Current Avg', value: fmtVal(fleetLast, metric.unit) },
            { label: 'Fleet Peak', value: fmtVal(fleetPeak, metric.unit) },
            {
              label: 'Fleet Trend',
              value: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: fleetTrend > 0.5 ? 'var(--status-danger)' : fleetTrend < -0.5 ? 'var(--status-healthy)' : 'var(--text-muted)' }}>
                  {fleetTrend > 0.5 ? <TrendingUp size={11} /> : fleetTrend < -0.5 ? <TrendingDown size={11} /> : <Minus size={11} />}
                  {fleetTrend > 0 ? '+' : ''}{fmtVal(fleetTrend, metric.unit)}
                </span>
              )
            },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '8px 12px', background: 'var(--color-rgb-255-255-255-0-003)' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 650, letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: isExpanded ? 340 : 180, position: 'relative' }}>
        {isEmpty ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            No telemetry data found for range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
              <defs>
                {hosts.map(host => {
                  const c = SERVER_COLORS[host] || metric.color;
                  const safeId = `grad-${host.replace(/\s+/g, '-')}`;
                  return (
                    <linearGradient key={safeId} id={safeId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.16}/>
                      <stop offset="95%" stopColor={c} stopOpacity={0.0}/>
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rgb-255-255-255-0-015)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--color-rgb-255-255-255-0-2)" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-rgb-255-255-255-0-2)" fontSize={9} tickLine={false} axisLine={false}
                domain={metric.unit === '%' ? [0, 100] : ['auto', 'auto']}
                tickFormatter={v => metric.unit === 'B/s' ? fmtBytes(v) : `${v}${metric.unit}`}
              />
              <Tooltip content={<CustomTooltip unit={metric.unit} />} cursor={{ stroke: 'var(--color-rgb-255-255-255-0-05)', strokeWidth: 1 }} />
              {metric.thresh && (
                <ReferenceLine y={metric.thresh} stroke="var(--color-rgb-239-68-68-0-2)" strokeDasharray="3 3" />
              )}
              {hosts.map(host => {
                const c = SERVER_COLORS[host] || metric.color;
                const safeId = `grad-${host.replace(/\s+/g, '-')}`;
                return (
                  <Area
                    key={host} type="monotone" dataKey={host}
                    stroke={c} strokeWidth={2}
                    fill={`url(#${safeId})`}
                    style={{ filter: `drop-shadow(0px 2px 6px ${c}30)` }}
                    dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: c }}
                    isAnimationActive={false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-server current values pills */}
      {hosts.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--color-rgb-255-255-255-0-015)', paddingTop: '12px' }}>
          {hosts.map(host => {
            const s = stats[host];
            const c = SERVER_COLORS[host] || metric.color;
            if (!s) return null;
            return (
              <div key={host} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--color-rgb-255-255-255-0-02)', borderRadius: 'var(--radius-sm)', padding: '4px 8px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{host}:</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: metric.thresh && s.last > metric.thresh ? 'var(--status-danger)' : 'var(--text-primary)' }}>
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
export default function GraphsView({ initialServer = 'all', initialMetric = null, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(3600);
  const [serverFilter, setServerFilter] = useState(initialServer);
  const [expandedMetric, setExpandedMetric] = useState(initialMetric);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease' }}>

      {/* ── Header Row ── */}
      <div className="graphs-header">
        <div className="graphs-breadcrumbs">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Infrastructure</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Telemetry</span>
        </div>
        
        <div className="graphs-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button 
              onClick={onBack} 
              style={{
                background: 'transparent',
                border: '1px solid var(--color-rgb-255-255-255-0-06)',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              className="graphs-back-btn"
              aria-label="Go Back to Server"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
            Telemetry Analytics
          </h2>
        </div>

        <div className="graphs-header-actions">
          <div className="graphs-controls-row">
            {/* Time range picker */}
            <div className="graphs-time-picker">
              {TIME_RANGES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  style={{
                    background: timeRange === t.id ? 'var(--text-primary)' : 'transparent',
                    border: 'none', 
                    color: timeRange === t.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    padding: '5px 12px', 
                    cursor: 'pointer', 
                    fontSize: '0.7rem', 
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                  className="graphs-time-btn"
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Server filter */}
            <select
              value={serverFilter}
              onChange={e => setServerFilter(e.target.value)}
              className="graphs-select-filter"
              style={selectFilterStyle}
            >
              <option value="all">All Servers</option>
              {SERVERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="graphs-meta-row">
            {lastUpdated && (
              <span className="graphs-last-updated">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}

            <button
              onClick={load}
              className="graphs-refresh-btn"
              style={refreshBtnStyle}
              disabled={loading}
            >
              <RefreshCw size={12} className={loading ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Server Color Legend row ── */}
      <div className="graphs-legend-container">
        {SERVERS.map(s => (
          <div key={s} className="graphs-legend-item">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: SERVER_COLORS[s], display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s}</span>
          </div>
        ))}
        <div className="graphs-legend-threshold">
          <div style={{ width: 16, height: 1, borderTop: '1px dashed var(--color-rgb-239-68-68-0-4)' }} />
          <span style={{ fontSize: '0.68rem', color: 'var(--color-rgb-239-68-68-0-6)' }}>Alert threshold</span>
        </div>
      </div>

      {/* ── Metric Grid ── */}
      {loading && !data ? (
        <div className="graphs-metrics-grid shimmer">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="shimmer-card" style={{ height: '300px' }} />
          ))}
        </div>
      ) : (
        <div className="graphs-metrics-grid" style={{
          gridTemplateColumns: expandedMetric ? '1fr' : undefined
        }}>
          {visibleMetrics.map(metric => (
            <MetricPanel
              key={metric.id}
              metric={metric}
              rawSeries={data?.[metric.id] || []}
              timeRange={timeRange}
              serverFilter={serverFilter}
              isExpanded={!!expandedMetric}
              onExpand={() => setExpandedMetric(expandedMetric === metric.id ? null : metric.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline Styles ─────────────────────────────────────────────────────────────
const panelBtnStyle = {
  background: 'var(--color-rgb-255-255-255-0-01)',
  border: '1px solid var(--color-rgb-255-255-255-0-03)',
  color: 'var(--text-secondary)',
  borderRadius: 'var(--radius-sm)',
  padding: '5px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
};

const selectFilterStyle = {
  background: 'var(--color-rgb-255-255-255-0-02)',
  border: '1px solid var(--color-rgb-255-255-255-0-03)',
  color: 'var(--text-primary)',
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  cursor: 'pointer',
  fontSize: '0.72rem',
  fontWeight: 500
};

const refreshBtnStyle = {
  background: 'var(--color-rgb-255-255-255-0-02)',
  border: '1px solid var(--color-rgb-255-255-255-0-03)',
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

