import React from 'react';
import { Cpu, HardDrive, MemoryStick, Clock, Server, Globe, AlertTriangle, ArrowDown, ArrowUp, Activity, Wifi, CheckCircle, XCircle } from 'lucide-react';

function getMetricColor(val) {
  const n = parseFloat(val) || 0;
  if (n > 85) return '#ef4444';
  if (n > 70) return '#f59e0b';
  return '#10b981';
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B/s';
  const k = 1024, sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getUptimeString(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function LinearProgress({ value }) {
  const val = Math.min(parseFloat(value) || 0, 100);
  const color = getMetricColor(val);
  return (
    <div style={{ width: '100%', height: '3px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{ width: `${val}%`, height: '100%', backgroundColor: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

function MetricStat({ label, value, icon: Icon }) {
  const numVal = parseFloat(value) || 0;
  const color = getMetricColor(numVal);
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      background: '#16161a',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</span>
        <Icon size={11} color="var(--text-muted)" style={{ opacity: 0.8 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{numVal.toFixed(0)}</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>%</span>
      </div>
      <LinearProgress value={numVal} />
    </div>
  );
}

export default function ServerCard({ name, ip, cpu, ram, disk, uptime, status, load, netRecv, netSent }) {
  const parsedCpu = parseFloat(cpu) || 0;
  const parsedRam = parseFloat(ram) || 0;
  const parsedDisk = parseFloat(disk) || 0;
  const isOnline = status === 'online';
  const isCrit = parsedCpu > 85 || parsedRam > 85 || parsedDisk > 85;
  const isWarn = !isCrit && (parsedCpu > 70 || parsedRam > 70 || parsedDisk > 70);

  let accentColor = 'var(--text-muted)';
  let borderColor = 'var(--border-color)';
  if (isOnline) {
    if (isCrit) {
      accentColor = 'var(--status-danger)';
      borderColor = 'rgba(239, 68, 68, 0.2)';
    } else if (isWarn) {
      accentColor = 'var(--status-warning)';
      borderColor = 'rgba(245, 158, 11, 0.2)';
    } else {
      accentColor = 'var(--status-healthy)';
    }
  }

  const healthLabel = !isOnline ? 'Offline' : isCrit ? 'Critical' : isWarn ? 'Warning' : 'Healthy';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      transition: 'border-color 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Globe size={10} color="var(--text-muted)" />
              <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{ip}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{
            fontSize: '0.62rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: accentColor,
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid var(--border-color)',
            padding: '2px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {healthLabel}
          </div>
          {isOnline && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} /> {getUptimeString(uptime)}
            </div>
          )}
        </div>
      </div>

      {/* Gauge row */}
      {isOnline ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <MetricStat label="CPU" value={cpu} icon={Cpu} />
            <MetricStat label="Memory" value={ram} icon={MemoryStick} />
            <MetricStat label="Disk" value={disk} icon={HardDrive} />
          </div>

          {/* Bottom stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            {[
              { label: 'Load Avg', value: load || '—', icon: Activity, color: 'var(--text-secondary)' },
              { label: 'Net In', value: formatBytes(netRecv), icon: ArrowDown, color: 'var(--text-secondary)' },
              { label: 'Net Out', value: formatBytes(netSent), icon: ArrowUp, color: 'var(--text-secondary)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                  <Icon size={10} color={color} style={{ opacity: 0.7 }} />
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', gap: '6px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <XCircle size={12} /> No telemetry — offline
        </div>
      )}
    </div>
  );
}
