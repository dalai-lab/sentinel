import React from 'react';
import { Server, Layers, Cpu, HardDrive, Clock, ShieldCheck, ShieldAlert, ArrowDown, ArrowUp, Activity } from 'lucide-react';

function UptimeFriendly({ seconds }) {
  if (!seconds) return 'Unknown';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatNetworkSpeed(bytesPerSec) {
  if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec < 0) return '0 B/s';
  if (bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  const index = Math.min(Math.max(i, 0), sizes.length - 1);
  return parseFloat((bytesPerSec / Math.pow(k, index)).toFixed(1)) + ' ' + sizes[index];
}

function MiniBar({ label, value, icon: Icon, color }) {
  const numValue = parseFloat(value) || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Icon size={12} /> {label}
        </span>
        <span style={{ fontWeight: 600, color: color || 'var(--text-primary)' }}>{numValue}%</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${numValue}%`, background: color || 'var(--accent)', borderRadius: '3px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function ServerList({ servers }) {
  const serverDetails = [
    { name: 'Oracle database server', ip: '80.225.241.81', host: 'instance-20260630-1713', role: 'Central Hub — runs SigNoz, Supabase, Sentinel Dashboard', os: 'Ubuntu 22.04 LTS' },
    { name: 'Orbithyre', ip: '31.97.235.136', host: 'srv1213878', role: 'Web server — hosts OrbitHyre enterprise platform', os: 'Ubuntu 20.04 LTS' },
    { name: 'Gaplytiq', ip: '72.61.235.141', host: 'srv1176513', role: 'Web server — hosts Gaplytiq platform', os: 'Ubuntu 20.04 LTS' },
    { name: 'Dalai', ip: '168.231.122.248', host: 'srv1055295', role: 'Web server — hosts Dalai.in services', os: 'Debian 11 stable' }
  ];

  const getMetricColor = (val) => {
    const num = parseFloat(val) || 0;
    if (num > 85) return 'var(--status-danger)';
    if (num > 70) return 'var(--status-warning)';
    return 'var(--status-healthy)';
  };

  const onlineCount = serverDetails.filter(d => 
    (servers || []).some(s => (s.ip === d.ip || s.name.toLowerCase() === d.name.toLowerCase()) && s.status === 'online')
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Server Fleet Inventory</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Detailed system metrics, active network throughput, and hardware statuses.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem' }}>
          <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Total Nodes: {serverDetails.length}
          </span>
          <span style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, color: 'var(--status-healthy)' }}>
            Online: {onlineCount}
          </span>
          {serverDetails.length - onlineCount > 0 && (
            <span style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, color: 'var(--status-danger)' }}>
              Offline: {serverDetails.length - onlineCount}
            </span>
          )}
        </div>
      </div>

      {/* Grid of details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {serverDetails.map((srv, idx) => {
          const liveData = (servers || []).find(s => s.ip === srv.ip || s.name.toLowerCase() === srv.name.toLowerCase());
          const isOnline = liveData?.status === 'online';

          return (
            <div
              key={idx}
              className="dashboard-card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                transition: 'border-color 0.15s'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    background: isOnline ? 'var(--status-healthy-bg)' : 'rgba(255,255,255,0.02)',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <Server size={18} color={isOnline ? 'var(--status-healthy)' : 'var(--text-muted)'} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{srv.name}</h3>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.78rem' }} className="text-muted text-mono">
                      <span>IP: {srv.ip}</span>
                      <span>•</span>
                      <span>Host: {srv.host}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)'
                  }}>
                    {srv.os}
                  </span>

                  <div style={{
                    fontSize: '0.72rem',
                    background: isOnline ? 'var(--status-healthy-bg)' : 'rgba(255,255,255,0.02)',
                    color: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)',
                    border: `1px solid ${isOnline ? 'rgba(16,185,129,0.15)' : 'var(--border-color)'}`,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    {isOnline ? (
                      <>
                        <ShieldCheck size={11} />
                        <span>Telemetry Active</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={11} color="var(--text-muted)" />
                        <span>Offline / Unreachable</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Live Telemetry Metrics */}
              {isOnline && liveData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Performance Indicators Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: '16px', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.03)', 
                    padding: '16px', 
                    borderRadius: '8px' 
                  }}>
                    <MiniBar 
                      label="CPU Resource" 
                      value={liveData.cpu} 
                      icon={Cpu} 
                      color={getMetricColor(liveData.cpu)} 
                    />
                    <MiniBar 
                      label="Memory Load" 
                      value={liveData.ram} 
                      icon={Layers} 
                      color={getMetricColor(liveData.ram)} 
                    />
                    <MiniBar 
                      label="Root Disk Space" 
                      value={liveData.disk} 
                      icon={HardDrive} 
                      color={getMetricColor(liveData.disk)} 
                    />
                  </div>

                  {/* Operational Details Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {/* Load Average */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Activity size={10} /> Load Average
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>{liveData.load || '—'}</div>
                    </div>

                    {/* Network In */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowDown size={10} color="#10b981" /> Network In
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }} className="text-mono">
                        {formatNetworkSpeed(liveData.netRecv)}
                      </div>
                    </div>

                    {/* Network Out */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUp size={10} color="var(--accent)" /> Network Out
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }} className="text-mono">
                        {formatNetworkSpeed(liveData.netSent)}
                      </div>
                    </div>

                    {/* Node Uptime */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> Node Uptime
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <UptimeFriendly seconds={liveData.uptime} />
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '24px', 
                  borderRadius: '8px', 
                  background: 'rgba(0,0,0,0.1)', 
                  border: '1px solid rgba(255,255,255,0.02)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  gap: '6px'
                }}>
                  <ShieldAlert size={14} />
                  No live metrics stream detected. Server is currently offline.
                </div>
              )}

              {/* Server Role Description */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, background: 'rgba(0,0,0,0.12)', padding: '12px 16px', borderRadius: '6px' }}>
                <strong>Role & Purpose:</strong> {srv.role}
              </div>

              {/* Active Services Setup */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)' }}>
                    <ShieldCheck size={12} color={isOnline ? 'var(--status-healthy)' : 'var(--text-muted)'} />
                    <span>node_exporter v1.5.0 (Port 9100)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)' }}>
                    <ShieldCheck size={12} color={isOnline ? 'var(--status-healthy)' : 'var(--text-muted)'} />
                    <span>otel-collector daemon (Active)</span>
                  </div>
                </div>
                
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }} className="text-mono">
                  read_only_access
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
