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
    <div className="ssh-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      
      {/* TABS (Severity) */}
      <div className="tabs" style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
        {['ALL', 'ERROR', 'WARN', 'INFO'].map(lvl => (
          <button 
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              background: levelFilter === lvl ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: levelFilter === lvl ? '#60a5fa' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* SEARCH AND SERVICE FILTER */}
      <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0 12px', flex: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Search size={14} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search log messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', padding: '8px 12px', width: '100%', outline: 'none', fontSize: '13px' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Layers size={14} color="var(--text-muted)" style={{ marginRight: '8px' }} />
          <select 
            value={serviceFilter} 
            onChange={(e) => setServiceFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none', cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}
          >
            {SERVICES.map(srv => (
              <option key={srv} value={srv}>{srv === 'all' ? 'All Services' : srv}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={refreshLogs} 
          disabled={loading}
          style={{ 
            background: 'rgba(0,0,0,0.2)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            color: 'var(--text-color)', 
            padding: '8px', 
            borderRadius: '6px',
            cursor: loading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
        <button 
          onClick={() => setIsLive(!isLive)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)',
            border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`,
            color: isLive ? '#10b981' : 'var(--text-color)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '13px',
            transition: 'all 0.2s'
          }}
        >
          {isLive ? <Pause size={14} /> : <Play size={14} />}
          {isLive ? 'Live Tail' : 'Paused'}
        </button>
      </div>

    </div>
  );
}
