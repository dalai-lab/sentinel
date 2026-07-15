import React from 'react';
import { Cpu, HardDrive, Database, Clock, Server, Globe, AlertTriangle } from 'lucide-react';

// Reimagined Premium Continuous Progress Bar (Normal bar but better)
function PremiumProgressBar({ value, warningThreshold = 85 }) {
  const parsedValue = parseFloat(value) || 0;

  const getStatusColor = (val) => {
    if (val > warningThreshold) return 'var(--status-danger)';
    if (val > 70) return 'var(--status-warning)';
    return 'var(--status-healthy)';
  };

  const activeColor = getStatusColor(parsedValue);

  return (
    <div style={{
      height: '8px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '4px',
      overflow: 'hidden',
      position: 'relative',
      marginTop: '6px'
    }}>
      <div
        style={{
          height: '100%',
          width: `${parsedValue}%`,
          background: `linear-gradient(90deg, ${activeColor}bb 0%, ${activeColor} 100%)`,
          boxShadow: `0 0 10px ${activeColor}40`,
          borderRadius: '4px',
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
        className="progress-fill-animate"
      />
    </div>
  );
}

export default function ServerCard({ name, ip, cpu, ram, disk, uptime, status }) {
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
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isOnline = status === 'online';

  // Decide overall health of the server card
  let healthState = 'healthy';
  if (!isOnline) healthState = 'offline';
  else if (isAnyMetricHigh) healthState = 'danger';
  else if (parsedCpu > 70 || parsedRam > 70 || parsedDisk > 70) healthState = 'warning';

  const getCardBorderColor = () => {
    if (healthState === 'offline' || healthState === 'danger') return 'rgba(239, 68, 68, 0.3)';
    if (healthState === 'warning') return 'rgba(245, 158, 11, 0.3)';
    return 'var(--border-color)';
  };

  return (
    <div
      className={`dashboard-card premium-server-card state-${healthState}`}
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: getCardBorderColor(),
        boxShadow: healthState === 'danger' ? '0 0 15px rgba(239, 68, 68, 0.05)' : 'none'
      }}
    >
      {/* Header section of the card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className={`server-icon-container status-${isOnline ? 'online' : 'offline'}`} style={{
            background: isOnline ? 'var(--status-healthy-bg)' : 'var(--status-danger-bg)',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <Server size={18} color={isOnline ? 'var(--status-healthy)' : 'var(--status-danger)'} />
            {isOnline && <span className="status-ping-dot" />}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {name}
            </h4>
            <div className="text-muted text-mono" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <Globe size={11} />
              <span>{ip}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div
            className="status-pill"
            style={{
              background: isOnline ? 'var(--status-healthy-bg)' : 'var(--status-danger-bg)',
              color: isOnline ? 'var(--status-healthy)' : 'var(--status-danger)',
              border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
            }}
          >
            {status}
          </div>
          <div className="text-muted" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            <span>Up {getUptimeString(uptime)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bars / Telemetry Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* CPU Usage */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem', alignItems: 'center' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> CPU
              {isCpuHigh && <AlertTriangle size={12} color="var(--status-danger)" className="metric-warning-pulse" />}
            </span>
            <span style={{ color: getStatusColor(cpu), fontWeight: 700 }}>{cpu}%</span>
          </div>
          <PremiumProgressBar value={cpu} />
        </div>

        {/* Memory Usage */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem', alignItems: 'center' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={14} /> Memory
              {isRamHigh && <AlertTriangle size={12} color="var(--status-danger)" className="metric-warning-pulse" />}
            </span>
            <span style={{ color: getStatusColor(ram), fontWeight: 700 }}>{ram}%</span>
          </div>
          <PremiumProgressBar value={ram} />
        </div>

        {/* Disk Storage */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem', alignItems: 'center' }}>
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={14} /> Disk Storage
              {isDiskHigh && <AlertTriangle size={12} color="var(--status-danger)" className="metric-warning-pulse" />}
            </span>
            <span style={{ color: getStatusColor(disk), fontWeight: 700 }}>{disk}%</span>
          </div>
          <PremiumProgressBar value={disk} />
        </div>
      </div>

      <style>{`
        .premium-server-card {
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease !important;
        }
        .premium-server-card:hover {
          transform: translateY(-4px) scale(1.01) !important;
          box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.5) !important;
        }
        .premium-server-card.state-danger:hover {
          box-shadow: 0 16px 32px -8px rgba(239, 68, 68, 0.1) !important;
          border-color: var(--status-danger) !important;
        }
        .premium-server-card.state-warning:hover {
          box-shadow: 0 16px 32px -8px rgba(245, 158, 11, 0.1) !important;
          border-color: var(--status-warning) !important;
        }
        
        /* Status ping dot animation */
        .status-ping-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--status-healthy);
          border: 2px solid var(--bg-card);
          box-shadow: 0 0 8px var(--status-healthy);
          animation: statusPing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes statusPing {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }

        /* Metric Alert animation */
        .metric-warning-pulse {
          animation: warnPulse 1s ease-in-out infinite alternate;
        }
        @keyframes warnPulse {
          from { opacity: 0.4; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1.1); }
        }

        /* Continuous progress bar sliding stripes overlay animation */
        .progress-fill-animate::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.1) 75%,
            transparent 75%,
            transparent
          );
          background-size: 15px 15px;
          animation: moveStripes 1.2s linear infinite;
          opacity: 0.45;
        }
        @keyframes moveStripes {
          0% { background-position: 0 0; }
          100% { background-position: 15px 0; }
        }
      `}</style>
    </div>
  );
}
