import React from 'react';
import { Search, Layers, Play, Pause, RefreshCw } from 'lucide-react';

const SERVICES = ['all', 'otelcol', 'nginx', 'supabase-auth', 'node_exporter', 'sentinel-backend', 'postgres-db', 'signoz-query', 'sentinel-agent', 'crowdsec'];

export default function LogConsoleFilters({
  levelFilter,
  setLevelFilter,
  serviceFilter,
  setServiceFilter,
  searchQuery,
  setSearchQuery,
  isLive,
  setIsLive,
  refreshLogs,
  loading
}) {
  return (
    <div className="ssh-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px' }}>
      
      {/* TABS (Severity) */}
      <div className="tabs" style={{ display: 'flex', gap: '4px', background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--border-color)', padding: '3px', borderRadius: '4px' }}>
        {['ALL', 'ERROR', 'WARN', 'INFO'].map(lvl => (
          <button 
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            style={{
              padding: '4px 12px',
              borderRadius: '3px',
              background: levelFilter === lvl ? 'var(--text-primary)' : 'transparent',
              color: levelFilter === lvl ? 'var(--bg-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 600,
              transition: 'all 0.15s ease'
            }}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* SEARCH AND SERVICE FILTER */}
      <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--color-rgb-255-255-255-0-01)', borderRadius: '4px', padding: '0 8px', flex: 1, border: '1px solid var(--border-color)' }}>
          <Search size={12} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search logs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '6px 8px', width: '100%', outline: 'none', fontSize: '0.74rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-rgb-255-255-255-0-01)', borderRadius: '4px', padding: '0 8px', border: '1px solid var(--border-color)' }}>
          <Layers size={12} color="var(--text-muted)" style={{ marginRight: '6px' }} />
          <select 
            value={serviceFilter} 
            onChange={(e) => setServiceFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.74rem', textTransform: 'capitalize' }}
          >
            {SERVICES.map(srv => (
              <option key={srv} value={srv}>{srv === 'all' ? 'All Services' : srv}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button 
          onClick={refreshLogs} 
          disabled={loading}
          style={{ 
            background: 'var(--color-rgb-255-255-255-0-01)', 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', 
            padding: '6px 8px', 
            borderRadius: '4px',
            cursor: loading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Refresh"
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
        </button>
        <button 
          onClick={() => setIsLive(!isLive)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: isLive ? 'var(--color-rgb-16-185-129-0-05)' : 'var(--color-rgb-255-255-255-0-01)',
            border: `1px solid ${isLive ? 'var(--color-rgb-16-185-129-0-2)' : 'var(--border-color)'}`,
            color: isLive ? 'var(--status-healthy)' : 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.72rem',
            transition: 'all 0.15s'
          }}
        >
          {isLive ? <Pause size={12} /> : <Play size={12} />}
          {isLive ? 'Live Tail' : 'Paused'}
        </button>
      </div>

    </div>
  );
}
