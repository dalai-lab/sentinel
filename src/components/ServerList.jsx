import React, { useState } from 'react';
import { Copy, Check, Server, Terminal, Layers } from 'lucide-react';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Monitored Servers</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Listing all configured and monitored servers.</p>
        </div>

        <span style={{
          fontSize: '0.8rem',
          background: 'rgba(99,102,241,0.1)',
          color: 'var(--accent)',
          border: '1px solid rgba(99,102,241,0.2)',
          padding: '6px 12px',
          borderRadius: '6px',
          fontWeight: 600
        }}>
          Total Servers: {serverDetails.length}
        </span>
      </div>

      {/* Grid of details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {serverDetails.map((srv, idx) => {
          const liveState = servers.find(s => s.name.toLowerCase() === srv.name.toLowerCase() || s.ip === srv.ip);
          const isOnline = liveState?.status === 'online';
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className="dashboard-card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderLeft: `3px solid ${isOnline ? 'var(--status-healthy)' : 'var(--border-color)'}`
              }}
            >
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
                    fontSize: '0.75rem',
                    background: isOnline ? 'var(--status-healthy-bg)' : 'var(--status-danger-bg)',
                    color: isOnline ? 'var(--status-healthy)' : 'var(--status-danger)',
                    border: `1px solid ${isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {isOnline ? 'Telemetry Active' : 'Connecting'}
                  </div>
                </div>
              </div>

              {/* Server Role Description */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '6px' }}>
                <strong>Role:</strong> {srv.role}
              </div>

              {/* Active Services & Setup */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Layers size={12} color="var(--status-healthy)" />
                    <span>node_exporter (Port 9100)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Terminal size={12} color="var(--status-healthy)" />
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
