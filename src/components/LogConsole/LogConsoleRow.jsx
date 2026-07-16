import React from 'react';
import { ArrowRight, Activity, Terminal } from 'lucide-react';

const getLevelColor = (level) => {
  switch (level) {
    case 'ERROR': return '#ef4444';
    case 'WARN': return '#f59e0b';
    case 'DEBUG': return '#71717a';
    default: return '#10b981';
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
        gap: '16px',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        transition: 'background 0.2s',
        fontSize: '13px'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0, width: '100px' }}>
        {timeStr}
      </div>
      
      <div style={{ flexShrink: 0, width: '60px' }}>
        <span style={{ 
          color: color, 
          background: `${color}15`, 
          padding: '2px 6px', 
          borderRadius: '4px', 
          fontSize: '11px', 
          fontWeight: 600,
          border: `1px solid ${color}30`
        }}>
          {log.level}
        </span>
      </div>

      <div style={{ flexShrink: 0, width: '120px', color: 'var(--primary-color)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.service}>
        [{log.service}]
      </div>

      <div style={{ flex: 1, color: 'var(--text-color)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {log.msg}
      </div>

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={() => onClickTrace(log)}
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
        >
          <Activity size={12} />
          Trace
        </button>
      </div>
    </div>
  );
}
