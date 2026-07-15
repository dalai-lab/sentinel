import React, { useState } from 'react';
import { Copy, Check, Server, Terminal, Layers, Cpu, HardDrive, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';

function UptimeFriendly({ seconds }) {
  if (!seconds) return 'Unknown';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function MiniBar({ label, value, icon: Icon, color }) {
  const numValue = parseFloat(value) || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Icon size={11} /> {label}
        </span>
        <span style={{ fontWeight: 700, color: color || 'var(--text-primary)' }}>{numValue}%</span>
      </div>
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${numValue}%`, background: color || 'var(--accent)', borderRadius: '3px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function ServerList({ servers }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const serverDetails = [
    { name: 'Oracle database server', ip: '80.225.241.81', host: 'instance-20260630-1713', role: 'Central Hub — runs SigNoz, Supabase, Sentinel Dashboard', os: 'Ubuntu 22.04 LTS' },
    { name: 'Orbithyre', ip: '31.97.235.136', host: 'srv1213878', role: 'Web server — hosts OrbitHyre enterprise platform', os: 'Ubuntu 20.04 LTS' },
    { name: 'Gaplytiq', ip: '72.61.235.141', host: 'srv1176513', role: 'Web server — hosts Gaplytiq platform', os: 'Ubuntu 20.04 LTS' },
    { name: 'Dalai', ip: '168.231.122.248', host: 'srv1055295', role: 'Web server — hosts Dalai.in services', os: 'Debian 11 stable' }
  ];

  const handleCopyCmd = (ip, index) => {
    const cmd = `curl -sSL https://raw.githubusercontent.com/dalai-lab/sentinel/main/install_agent.sh | bash -s -- --endpoint http://${ip}:4317`;
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Monitored Servers</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Listing all configured and monitored nodes with active telemetry.</p>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {serverDetails.map((srv, idx) => {
          const liveData = (servers || []).find(s => s.ip === srv.ip || s.name.toLowerCase() === srv.name.toLowerCase());
          const isOnline = liveData?.status === 'online';
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className="dashboard-card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                borderLeft: `3px solid ${isOnline ? 'var(--status-healthy)' : 'var(--border-color)'}`,
                transition: 'transform 0.15s, border-color 0.15s'
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
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0 }}>{srv.name}</h3>
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
                        <span>Connecting...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Live Telemetry Metrics */}
              {isOnline && liveData ? (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '16px', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid rgba(255,255,255,0.03)', 
                  padding: '12px 16px', 
                  borderRadius: '6px' 
                }}>
                  <MiniBar 
                    label="CPU Usage" 
                    value={liveData.cpu} 
                    icon={Cpu} 
                    color={getMetricColor(liveData.cpu)} 
                  />
                  <MiniBar 
                    label="RAM Usage" 
                    value={liveData.ram} 
                    icon={Layers} 
                    color={getMetricColor(liveData.ram)} 
                  />
                  <MiniBar 
                    label="Disk Usage" 
                    value={liveData.disk} 
                    icon={HardDrive} 
                    color={getMetricColor(liveData.disk)} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                      <Clock size={11} /> Node Uptime
                    </span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      <UptimeFriendly seconds={liveData.uptime} />
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px', 
                  borderRadius: '6px', 
                  background: 'rgba(0,0,0,0.1)', 
                  border: '1px solid rgba(255,255,255,0.02)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  gap: '6px'
                }}>
                  <ShieldAlert size={13} />
                  No live metrics received. Run the agent installer below to feed telemetry.
                </div>
              )}

              {/* Server Role Description */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, background: 'rgba(0,0,0,0.12)', padding: '10px 14px', borderRadius: '6px' }}>
                <strong>Node Role:</strong> {srv.role}
              </div>

              {/* Active Services & Setup */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)' }}>
                    <Layers size={12} />
                    <span>node_exporter (Port 9100)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: isOnline ? 'var(--status-healthy)' : 'var(--text-muted)' }}>
                    <Terminal size={12} />
                    <span>otelcol agent (Active)</span>
                  </div>
                </div>

                <button
                  onClick={() => handleCopyCmd(srv.ip, idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  className="setup-btn"
                >
                  {isCopied ? <Check size={12} color="var(--status-healthy)" /> : <Copy size={12} />}
                  <span>{isCopied ? 'Command Copied!' : 'Copy Installer Command'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .setup-btn:hover {
          background: rgba(99,102,241,0.12) !important;
          border-color: rgba(99,102,241,0.4) !important;
        }
      `}</style>
    </div>
  );
}
