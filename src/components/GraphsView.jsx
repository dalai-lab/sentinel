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
    color: 'var(--status-healthy)',
    desc: 'Processor load across all cores',
    thresh: 85,
  },
  {
    id: 'mem', label: 'Memory', unit: '%', icon: Activity,
    color: '#a78bfa',
    desc: 'RAM utilisation',
    thresh: 90,
  },
  {
    id: 'disk', label: 'Disk Usage', unit: '%', icon: HardDrive,
    color: 'var(--status-warning)',
    desc: 'Root filesystem consumption',
    thresh: 90,
  },
  {
    id: 'netRecv', label: 'Network In', unit: 'B/s', icon: Wifi,
    color: '#38bdf8',
    desc: 'Inbound bandwidth per server',
    thresh: null,
  },
];

const SERVER_COLORS = {
  'Oracle database server': 'var(--status-healthy)',
  'Orbithyre':              '#a78bfa',
  'Gaplytiq':               'var(--status-warning)',
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
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      minWidth: '160px',
    }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{p.dataKey}</span>
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtVal(p.value, unit)}</span>
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
  const borderAccent = isCritical ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${borderAccent}`,
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px' }}>
            <Icon size={14} color="var(--text-secondary)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{metric.label}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{metric.desc}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCritical && (
            <div style={{ background: 'rgba(239,68,68,0.05)', color: 'var(--status-danger)', fontSize: '0.62rem', fontWeight: 650, padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
              OVER THRESHOLD
            </div>
          )}
          <button onClick={onExpand} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {isExpanded ? <X size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Fleet-level stat strip */}
      {fleetLast != null && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Current Avg', value: fmtVal(fleetLast, metric.unit), color: 'var(--text-primary)' },
            { label: 'Peak', value: fmtVal(fleetPeak, metric.unit), color: 'var(--text-secondary)' },
            {
              label: 'Trend',
              value: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: fleetTrend > 0.5 ? 'var(--status-danger)' : fleetTrend < -0.5 ? 'var(--status-healthy)' : 'var(--text-muted)' }}>
                  {fleetTrend > 0.5 ? <TrendingUp size={11} /> : fleetTrend < -0.5 ? <TrendingDown size={11} /> : <Minus size={11} />}
                  {fleetTrend > 0 ? '+' : ''}{fmtVal(fleetTrend, metric.unit)}
                </span>
              ),
              color: 'var(--text-secondary)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: isExpanded ? 340 : 160, position: 'relative' }}>
        {isEmpty ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            No data for selected range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="1 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
              <XAxis
                dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickLine={false} axisLine={false} tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickLine={false} axisLine={false} tickMargin={4} width={40}
                tickFormatter={v => metric.unit === 'B/s' ? fmtBytes(v) : `${v}${metric.unit}`}
              />
              <Tooltip content={<CustomTooltip unit={metric.unit} />} />
              {metric.thresh && (
                <ReferenceLine y={metric.thresh} stroke="rgba(239,68,68,0.3)" strokeDasharray="3 3" strokeWidth={1} />
              )}
              {hosts.map(host => {
                const c = SERVER_COLORS[host] || metric.color;
                return (
                  <Area
                    key={host} type="monotoneX" dataKey={host}
                    stroke={c} strokeWidth={1.5}
                    fill="none"
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {hosts.map(host => {
            const s = stats[host];
            const c = SERVER_COLORS[host] || metric.color;
            if (!s) return null;
            return (
              <div key={host} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', padding: '3px 6px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{host}</span>
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
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Activity size={18} color="var(--text-secondary)" /> Telemetry Analytics
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Loading…'}
            {' · Auto-refreshes every 60s'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Time range pill buttons */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
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
                  fontSize: '0.72rem', 
                  fontWeight: 600,
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
            style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '0.74rem' }}
          >
            <option value="all">All Servers</option>
            {SERVERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button
            onClick={load}
            style={{ background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.72rem' }}
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Server color legend ── */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        {SERVERS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: SERVER_COLORS[s] }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 20, height: 1, borderTop: '1px dashed rgba(239,68,68,0.5)' }} />
          <span style={{ fontSize: '0.68rem', color: 'rgba(239,68,68,0.7)' }}>Alert threshold</span>
        </div>
      </div>

      {/* ── Metric grid ── */}
      {loading && !data && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          flex: 1,
          minHeight: 0,
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="shimmer-card" style={{ height: '300px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px', width: '50%' }}>
                  <div className="shimmer-bar" style={{ width: '28px', height: '28px' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="shimmer-bar" style={{ width: '80%', height: '12px' }} />
                    <div className="shimmer-bar" style={{ width: '40%', height: '8px' }} />
                  </div>
                </div>
                <div className="shimmer-bar" style={{ width: '40px', height: '20px' }} />
              </div>
              <div className="shimmer-bar" style={{ flex: 1, width: '100%', borderRadius: 'var(--radius-md)' }} />
            </div>
          ))}
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
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
