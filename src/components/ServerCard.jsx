import React from 'react';

export default function ServerCard({ name, ip, cpu, ram, disk, uptime, status }) {
  const getStatusColor = (val) => {
    if (val > 90) return 'var(--status-danger)';
    if (val > 70) return 'var(--status-warning)';
    return 'var(--status-healthy)';
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '1.1rem' }}>{name}</h4>
          <div className="text-muted" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{ip}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ padding: '4px 8px', borderRadius: '4px', background: status === 'online' ? 'rgba(46, 235, 159, 0.1)' : 'rgba(255, 74, 74, 0.1)', color: status === 'online' ? 'var(--status-healthy)' : 'var(--status-danger)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            {status}
          </div>
          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
            Up {formatUptime(uptime)}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span className="text-muted">CPU</span>
            <span style={{ color: getStatusColor(cpu), fontWeight: 500 }}>{cpu}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${cpu}%`, height: '100%', background: getStatusColor(cpu), transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span className="text-muted">Memory</span>
            <span style={{ color: getStatusColor(ram), fontWeight: 500 }}>{ram}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${ram}%`, height: '100%', background: getStatusColor(ram), transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span className="text-muted">Disk</span>
            <span style={{ color: getStatusColor(disk), fontWeight: 500 }}>{disk}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${disk}%`, height: '100%', background: getStatusColor(disk), transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
