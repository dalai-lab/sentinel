import React from 'react';
import { Server, Cpu, HardDrive, Clock, ShieldCheck, ShieldAlert, ArrowDown, ArrowUp, Activity, Globe, CheckCircle, XCircle, Layers } from 'lucide-react';

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
  if (n > 85) return '#ef4444';
  if (n > 70) return '#f59e0b';
  return '#10b981';
}

function HBar({ label, value, icon: Icon }) {
  const n = Math.min(parseFloat(value) || 0, 100);
  const c = metricColor(n);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
          <Icon size={11} color={c} /> {label}
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: c }}>{n.toFixed(1)}%</span>
      </div>
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${n}%`, background: `linear-gradient(90deg, ${c}88, ${c})`, borderRadius: '3px', boxShadow: n > 70 ? `0 0 6px ${c}` : 'none', transition: 'width 0.6s ease' }} />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px 0', color: '#f8fafc' }}>Server Fleet</h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Live telemetry, system health, and inventory across {details.length} nodes in Mumbai DC.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: `${details.length} Total Nodes`, color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
            { label: `${onlineCount} Online`, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
            ...(details.length - onlineCount > 0 ? [{ label: `${details.length - onlineCount} Offline`, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' }] : []),
          ].map(({ label, color, bg, border }) => (
            <div key={label} style={{ fontSize: '0.75rem', fontWeight: 700, color, background: bg, border: `1px solid ${border}`, padding: '6px 14px', borderRadius: '20px' }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Server cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {details.map(([name, info]) => {
          const live = (servers || []).find(s => s.ip === info.ip || s.name?.toLowerCase() === name.toLowerCase());
          const isOnline = live?.status === 'online';
          const isCrit = isOnline && (parseFloat(live?.cpu) > 85 || parseFloat(live?.ram) > 85 || parseFloat(live?.disk) > 85);
          const isWarn = isOnline && !isCrit && (parseFloat(live?.cpu) > 70 || parseFloat(live?.ram) > 70 || parseFloat(live?.disk) > 70);
          const roleColor = ROLE_COLORS[info.role] || '#818cf8';

          let borderColor = 'rgba(255,255,255,0.07)';
          let topBorder = 'rgba(255,255,255,0.1)';
          if (!isOnline) { borderColor = 'rgba(107,114,128,0.2)'; topBorder = '#6b7280'; }
          else if (isCrit) { borderColor = 'rgba(239,68,68,0.2)'; topBorder = '#ef4444'; }
          else if (isWarn) { borderColor = 'rgba(245,158,11,0.2)'; topBorder = '#f59e0b'; }
          else { borderColor = 'rgba(255,255,255,0.07)'; topBorder = '#10b981'; }

          return (
            <div key={name} style={{
              background: 'linear-gradient(145deg, #0d0f16, #11141f)',
              border: `1px solid ${borderColor}`,
              borderLeft: `4px solid ${topBorder}`,
              borderRadius: '16px',
              padding: '24px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '24px',
              alignItems: 'start',
              boxShadow: isCrit ? '0 0 24px rgba(239,68,68,0.08)' : 'none',
              transition: 'box-shadow 0.2s',
            }}>
              {/* Left: identity + metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Identity row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', border: `1px solid ${isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.15)'}`, borderRadius: '12px', padding: '12px', position: 'relative' }}>
                      <Server size={20} color={isOnline ? '#10b981' : '#6b7280'} />
                      {isOnline && <span style={{ position: 'absolute', bottom: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '2px solid #0d0f16', boxShadow: '0 0 8px #10b981', animation: 'ping 2s infinite' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc', marginBottom: '6px' }}>{name}</div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}><Globe size={10} />{info.ip}</span>
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>host: {info.host}</span>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.07)' }}>{info.os}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Role badge */}
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: roleColor, background: `${roleColor}15`, border: `1px solid ${roleColor}30`, padding: '4px 10px', borderRadius: '8px' }}>
                      {info.role}
                    </div>
                    {/* Status badge */}
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isOnline ? '#10b981' : '#6b7280', background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', border: `1px solid ${isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.15)'}`, padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {isOnline ? <><ShieldCheck size={10} /> Telemetry Active</> : <><ShieldAlert size={10} /> Offline</>}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                {isOnline && live ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
                      <HBar label="CPU Usage" value={live.cpu} icon={Cpu} />
                      <HBar label="Memory" value={live.ram} icon={Layers} />
                      <HBar label="Root Disk" value={live.disk} icon={HardDrive} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Load Avg', value: live.load || '—', icon: Activity, color: '#a78bfa' },
                        { label: 'Uptime', value: uptime(live.uptime), icon: Clock, color: '#60a5fa' },
                        { label: 'Net In', value: formatNet(live.netRecv), icon: ArrowDown, color: '#34d399' },
                        { label: 'Net Out', value: formatNet(live.netSent), icon: ArrowUp, color: '#f472b6' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                            <Icon size={11} color={color} />
                            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{label}</span>
                          </div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem' }}>
                    <XCircle size={14} /> No live metrics stream. Server is offline or unreachable.
                  </div>
                )}
              </div>

              {/* Right: services panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Active Services</div>
                {info.services.map(svc => (
                  <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#10b981' : '#6b7280', boxShadow: isOnline ? '0 0 6px #10b981' : 'none', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{svc}</span>
                  </div>
                ))}
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[{ label: 'node_exporter', port: '9100' }, { label: 'otel-collector', port: 'active' }].map(s => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                      <span>{s.label}</span>
                      <span style={{ color: isOnline ? '#10b981' : '#6b7280' }}>{s.port}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes ping { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);} }
      `}</style>
    </div>
  );
}
