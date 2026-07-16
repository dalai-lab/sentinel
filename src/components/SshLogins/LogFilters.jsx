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
    <div className="ssh-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
      
      {/* TABS */}
      <div className="tabs" style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
        {['all', 'logins', 'failures', 'security alerts'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              background: activeTab === tab ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === tab ? '#60a5fa' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              textTransform: 'capitalize',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SEARCH AND SERVER FILTER */}
      <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0 12px', flex: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Search size={14} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search IP, User, location or ISP..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', padding: '8px 12px', width: '100%', outline: 'none', fontSize: '13px' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Server size={14} color="var(--text-muted)" style={{ marginRight: '8px' }} />
          <select 
            value={serverFilter} 
            onChange={(e) => setServerFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
          >
            <option value="all">All Servers</option>
            {uniqueServers.map(srv => (
              <option key={srv} value={srv}>{srv}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
