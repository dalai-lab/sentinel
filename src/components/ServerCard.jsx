import React from 'react';
import { Cpu, HardDrive, Database, Clock, Server, Globe, AlertTriangle } from 'lucide-react';

// Reimagined AAA-Grade Premium Progress Bar
function PremiumProgressBar({ value, warningThreshold = 85 }) {
  const parsedValue = parseFloat(value) || 0;

  const getStatusColor = (val) => {
    if (val > warningThreshold) return '#ef4444'; // var(--status-danger)
    if (val > 70) return '#f59e0b'; // var(--status-warning)
    return '#10b981'; // var(--status-healthy)
  };

  const activeColor = getStatusColor(parsedValue);

  return (
    <div style={{
      height: '8px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '4px',
      overflow: 'hidden',
      position: 'relative',
      marginTop: '6px',
      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
    }}>
      <div
        style={{
          height: '100%',
          width: `${parsedValue}%`,
          background: `linear-gradient(90deg, ${activeColor}bb 0%, ${activeColor} 100%)`,
          boxShadow: `0 0 10px ${activeColor}80`,
          borderRadius: '4px',
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      />
    </div>
  );
}

export default function ServerCard({ name, ip, cpu, ram, disk, uptime, status, load, netRecv, netSent }) {
  const parsedCpu = parseFloat(cpu) || 0;
  const parsedRam = parseFloat(ram) || 0;
  const parsedDisk = parseFloat(disk) || 0;

  const isCpuHigh = parsedCpu > 85;
  const isRamHigh = parsedRam > 85;
  const isDiskHigh = parsedDisk > 85;
  const isAnyMetricHigh = isCpuHigh || isRamHigh || isDiskHigh;

  const getStatusColor = (val) => {
    if (val > 85) return 'var(--status-danger)';
    if (val > 70) return 'var(--status-warning)';
    return 'var(--status-healthy)';
  };

  const getUptimeString = (seconds) => {
    if (!seconds) return 'Unknown';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[Math.min(i, sizes.length - 1)];
  };

  const isOnline = status === 'online';

  let healthState = 'healthy';
  if (!isOnline) healthState = 'offline';
  else if (isAnyMetricHigh) healthState = 'danger';
  else if (parsedCpu > 70 || parsedRam > 70 || parsedDisk > 70) healthState = 'warning';

  const getCardBorderColor = () => {
    if (healthState === 'offline' || healthState === 'danger') return 'rgba(239, 68, 68, 0.25)';
    if (healthState === 'warning') return 'rgba(245, 158, 11, 0.25)';
    return 'var(--border-color)';
  };

  return (
    <div
      className={`dashboard-card premium-server-card state-${healthState}`}
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: getCardBorderColor(),
        boxShadow: healthState === 'danger' ? '0 0 12px rgba(239, 68, 68, 0.04)' : 'none'
      }}
    >
      {/* Header section of the card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className={`server-icon-container status-${isOnline ? 'online' : 'offline'}`} style={{
            background: isOnline ? 'var(--status-healthy-bg)' : 'var(--status-danger-bg)',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <Server size={16} color={isOnline ? 'var(--status-healthy)' : 'var(--status-danger)'} />
            {isOnline && <span className="status-ping-dot" />}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              {name}
            </h4>
            <div className="text-muted text-mono" style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Globe size={10} />
              <span>{ip}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div
            className="status-pill"
            style={{
              background: isOnline ? 'var(--status-healthy-bg)' : 'var(--status-danger-bg)',
              color: isOnline ? 'var(--status-healthy)' : 'var(--status-danger)',
              border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}`,
              padding: '2px 8px',
              borderRadius: '8px',
              fontSize: '0.68rem',
              fontWeight: 750,
              textTransform: 'uppercase'
            }}
          >
            {status}
          </div>
          <div className="text-muted" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} />
            <span>Up {getUptimeString(uptime)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bars / Telemetry Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* CPU Usage */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '0.78rem', alignItems: 'center' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cpu size={12} /> CPU
              {isCpuHigh && <AlertTriangle size={10} color="var(--status-danger)" className="metric-warning-pulse" />}
            </span>
            <span style={{ color: getStatusColor(cpu), fontWeight: 700 }}>{cpu}%</span>
          </div>
          <PremiumProgressBar value={cpu} />
        </div>

        {/* Memory Usage */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '0.78rem', alignItems: 'center' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HardDrive size={12} /> Memory
              {isRamHigh && <AlertTriangle size={10} color="var(--status-danger)" className="metric-warning-pulse" />}
            </span>
            <span style={{ color: getStatusColor(ram), fontWeight: 700 }}>{ram}%</span>
          </div>
          <PremiumProgressBar value={ram} />
        </div>

        {/* Disk Storage */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '0.78rem', alignItems: 'center' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Database size={12} /> Disk Storage
              {isDiskHigh && <AlertTriangle size={10} color="var(--status-danger)" className="metric-warning-pulse" />}
            </span>
            <span style={{ color: getStatusColor(disk), fontWeight: 700 }}>{disk}%</span>
          </div>
          <PremiumProgressBar value={disk} />
        </div>
      </div>

      {/* Advanced Performance Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        paddingTop: '10px',
        marginTop: '2px'
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.02em' }}>CPU Load (1m)</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{load || '0.00'}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.02em' }}>Network IO</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', gap: '6px' }} className="text-mono">
            <span style={{ color: '#10b981' }}>↓{formatBytes(netRecv)}</span>
            <span style={{ color: '#6366f1' }}>↑{formatBytes(netSent)}</span>
          </div>
        </div>
      </div>

      <style>{`
        .premium-server-card {
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease !important;
        }
        .premium-server-card:hover {
          transform: translateY(-2px) scale(1.005) !important;
          box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.4) !important;
        }
        .premium-server-card.state-danger:hover {
          box-shadow: 0 10px 24px -6px rgba(239, 68, 68, 0.08) !important;
          border-color: var(--status-danger) !important;
        }
        .premium-server-card.state-warning:hover {
          box-shadow: 0 10px 24px -6px rgba(245, 158, 11, 0.08) !important;
          border-color: var(--status-warning) !important;
        }
        
        .status-ping-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--status-healthy);
          border: 1.5px solid var(--bg-card);
          box-shadow: 0 0 6px var(--status-healthy);
          animation: statusPing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes statusPing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }

        .metric-warning-pulse {
          animation: warnPulse 1s ease-in-out infinite alternate;
        }
        @keyframes warnPulse {
          from { opacity: 0.4; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
