import React from 'react';
import { Search, Server } from 'lucide-react';

export default function LogFilters({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  serverFilter,
  setServerFilter,
  quickFilter,
  setQuickFilter,
  uniqueServers
}) {
  return (
    <div className="ssh-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px' }}>
      
      {/* TABS */}
      <div className="tabs" style={{ display: 'flex', gap: '4px', background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--color-rgb-255-255-255-0-03)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
        {['all', 'logins', 'failures', 'security alerts'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === tab ? 'var(--text-primary)' : 'transparent',
              color: activeTab === tab ? 'var(--bg-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 500,
              textTransform: 'capitalize',
              transition: 'all 0.15s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SEARCH AND SERVER FILTER */}
      <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--color-rgb-255-255-255-0-015)', borderRadius: 'var(--radius-sm)', padding: '0 8px', flex: 1, border: '1px solid var(--color-rgb-255-255-255-0-03)' }}>
          <Search size={12} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search IP, User, location or ISP..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '6px 8px', width: '100%', outline: 'none', fontSize: '0.74rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-rgb-255-255-255-0-015)', borderRadius: 'var(--radius-sm)', padding: '0 8px', border: '1px solid var(--color-rgb-255-255-255-0-03)' }}>
          <Server size={12} color="var(--text-muted)" style={{ marginRight: '6px' }} />
          <select 
            value={serverFilter} 
            onChange={(e) => setServerFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.74rem' }}
          >
            <option value="all" style={{ background: 'var(--color-hex-09090b)' }}>All Servers</option>
            {uniqueServers.map(srv => (
              <option key={srv} value={srv} style={{ background: 'var(--color-hex-09090b)' }}>{srv}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
