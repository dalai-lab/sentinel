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
      className="log-line"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '6px 14px',
        borderBottom: '1px solid var(--border-color)',
        transition: 'background 0.15s',
        fontSize: '0.72rem',
        fontFamily: 'var(--font-mono)'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ color: 'var(--text-muted)', flexShrink: 0, width: '80px' }}>
        {timeStr}
      </div>
      
      <div style={{ flexShrink: 0, width: '50px' }}>
        <span style={{ 
          color: color, 
          background: `${color}08`, 
          padding: '1px 5px', 
          borderRadius: '3px', 
          fontSize: '0.62rem', 
          fontWeight: 650,
          border: `1px solid ${color}20`
        }}>
          {log.level}
        </span>
      </div>

      <div style={{ flexShrink: 0, width: '110px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.service}>
        [{log.service}]
      </div>

      <div style={{ flex: 1, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
        {log.msg}
      </div>

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button 
          onClick={() => onClickTrace(log)}
          style={{
            background: 'rgba(255,255,255,0.02)',
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
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        >
          <Activity size={10} />
          Trace
        </button>
      </div>
    </div>
  );
}
