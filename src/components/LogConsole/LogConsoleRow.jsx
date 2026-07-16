import React from 'react';
import { ArrowRight, Activity, Terminal } from 'lucide-react';

const getLevelColor = (level) => {
  switch (level) {
    case 'ERROR': return 'var(--status-danger)';
    case 'WARN': return 'var(--status-warning)';
    case 'DEBUG': return 'var(--text-muted)';
    default: return 'var(--status-healthy)';
  }
};

export default function LogConsoleRow({ log, onClickTrace }) {
  const timeStr = new Date(log.rawTs || Date.now()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(log.rawTs).slice(-3);
  const color = getLevelColor(log.level);

  return (
    <div 
      className="log-row-container"
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-rgb-255-255-255-0-02)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div className="log-row-time">
        {timeStr}
      </div>
      
      <div className="log-row-level">
        <span style={{ 
          color: color, 
          background: `${color}08`, 
          padding: '1px 5px', 
          borderRadius: '3px', 
          fontSize: '0.62rem', 
          fontWeight: 655,
          border: `1px solid ${color}20`,
          display: 'inline-block'
        }}>
          {log.level}
        </span>
      </div>

      <div className="log-row-service" title={log.service}>
        [{log.service}]
      </div>

      <div className="log-row-msg">
        {log.msg}
      </div>

      <div className="log-row-trace">
        <button 
          onClick={() => onClickTrace(log)}
          style={{
            background: 'var(--color-rgb-255-255-255-0-02)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            padding: '2px 8px',
            borderRadius: '3px',
            fontSize: '0.65rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-rgb-255-255-255-0-06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-rgb-255-255-255-0-02)'}
        >
          <Activity size={10} />
          <span>Trace</span>
        </button>
      </div>
    </div>
  );
}
