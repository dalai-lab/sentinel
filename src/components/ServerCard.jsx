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

// Radial gauge for a metric value
function RadialGauge({ value, size = 72 }) {
  const val = Math.min(parseFloat(value) || 0, 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (val / 100) * circ;
  const color = getMetricColor(val);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  );
}

function GaugeStat({ label, value, unit = '%', icon: Icon }) {
  const numVal = parseFloat(value) || 0;
  const color = unit === '%' ? getMetricColor(numVal) : '#60a5fa';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <RadialGauge value={unit === '%' ? numVal : 50} size={68} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Icon size={12} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: color }}>{unit === '%' ? `${numVal.toFixed(1)}%` : value}</div>
      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
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

  let accentColor = '#10b981';
  let accentGlow = 'rgba(16,185,129,0.12)';
  let borderColor = 'rgba(16,185,129,0.2)';
  if (!isOnline) { accentColor = '#6b7280'; accentGlow = 'transparent'; borderColor = 'rgba(107,114,128,0.2)'; }
  else if (isCrit) { accentColor = '#ef4444'; accentGlow = 'rgba(239,68,68,0.1)'; borderColor = 'rgba(239,68,68,0.3)'; }
  else if (isWarn) { accentColor = '#f59e0b'; accentGlow = 'rgba(245,158,11,0.08)'; borderColor = 'rgba(245,158,11,0.25)'; }

  const healthLabel = !isOnline ? 'Offline' : isCrit ? 'Critical' : isWarn ? 'Warning' : 'Healthy';

  return (
    <div style={{
      background: `linear-gradient(145deg, #0e1015, #13151e)`,
      border: `1px solid ${borderColor}`,
      borderTop: `3px solid ${accentColor}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${borderColor}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`; }}
    >
      {/* Background radial glow */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35`, borderRadius: '10px', padding: '10px', position: 'relative' }}>
            <Server size={18} color={accentColor} />
            {isOnline && <span style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid #0e1015', boxShadow: '0 0 8px #10b981', animation: 'statusPing 2s infinite' }} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Globe size={10} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>{ip}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{
            fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: accentColor, background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
            padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px'
          }}>
            {isOnline ? <CheckCircle size={10} /> : <XCircle size={10} />} {healthLabel}
          </div>
          {isOnline && (
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} /> {getUptimeString(uptime)}
            </div>
          )}
        </div>
      </div>

      {/* Gauge row */}
      {isOnline ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <GaugeStat label="CPU" value={cpu} icon={Cpu} />
            <GaugeStat label="Memory" value={ram} icon={MemoryStick} />
            <GaugeStat label="Disk" value={disk} icon={HardDrive} />
          </div>

          {/* Bottom stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px' }}>
            {[
              { label: 'Load Avg', value: load || '—', icon: Activity, color: '#a78bfa' },
              { label: 'Net In', value: formatBytes(netRecv), icon: ArrowDown, color: '#34d399' },
              { label: 'Net Out', value: formatBytes(netSent), icon: ArrowUp, color: '#60a5fa' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Icon size={10} color={color} />
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{label}</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', gap: '8px', color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>
          <XCircle size={14} /> No telemetry — server offline or unreachable
        </div>
      )}

      <style>{`
        @keyframes statusPing { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.4); } }
      `}</style>
    </div>
  );
}
