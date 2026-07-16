import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Activity } from 'lucide-react';
import { useSshLogs } from '../hooks/useSshLogs';
import LogFilters from './SshLogins/LogFilters';
import SshEventRow from './SshLogins/SshEventRow';
import ActiveSessionsPanel from './SshLogins/ActiveSessionsPanel';

export default function SshLoginsCard({ topThreat }) {
  const { allEvents, crowdSecEvents, ipGeo, loading, fetchingOlder, hasMore, loadOlderLogs } = useSshLogs();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [serverFilter, setServerFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [visibleCount, setVisibleCount] = useState(25);

  const observerTarget = useRef(null);

  // Reset visibleCount when filters change
  useEffect(() => {
    setVisibleCount(25);
  }, [activeTab, searchQuery, serverFilter, quickFilter]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading) {
          setVisibleCount(prev => {
            // If we have more items rendered locally, just show more
            if (prev < allEvents.length + crowdSecEvents.length) {
              return prev + 25;
            }
            return prev;
          });
          
          // If we are at the end of the local array and there is more to fetch, fetch it
          if (hasMore && !fetchingOlder) {
            loadOlderLogs();
          }
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, fetchingOlder, loading, loadOlderLogs]);

  // Combine & Filter Events
  const filteredEvents = React.useMemo(() => {
    let combined = [];
    if (activeTab === 'all') combined = [...allEvents, ...crowdSecEvents];
    else if (activeTab === 'logins') combined = allEvents.filter(e => e.status === 'success');
    else if (activeTab === 'failures') combined = allEvents.filter(e => e.status === 'failed' || e.status === 'disconnected');
    else if (activeTab === 'security alerts') combined = crowdSecEvents;

    // Apply Filters
    return combined.filter(e => {
      if (serverFilter !== 'all' && e.server !== serverFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesBasic = (e.user && e.user.toLowerCase().includes(q)) || (e.ip && e.ip.includes(q));
        const matchesGeo = ipGeo[e.ip] && (
          ipGeo[e.ip].country?.toLowerCase().includes(q) ||
          ipGeo[e.ip].city?.toLowerCase().includes(q) ||
          ipGeo[e.ip].isp?.toLowerCase().includes(q)
        );
        if (!matchesBasic && !matchesGeo) return false;
      }
      if (quickFilter === 'Non-Root Users') return e.user && e.user !== 'root' && e.user !== 'unknown';
      if (quickFilter === 'Suspected Bot Scans') return e.isBotScan || e.scenario;
      return true;
    }).sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
  }, [activeTab, allEvents, crowdSecEvents, serverFilter, searchQuery, quickFilter, ipGeo]);

  const uniqueServers = React.useMemo(() => {
    const srvs = new Set();
    allEvents.forEach(e => srvs.add(e.server));
    crowdSecEvents.forEach(e => srvs.add(e.server));
    return Array.from(srvs).filter(Boolean).sort();
  }, [allEvents, crowdSecEvents]);

  // Loading Skeleton
  if (loading && allEvents.length === 0 && crowdSecEvents.length === 0) {
    return (
      <div className="card" style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner"></div>
          <div>Loading Secure Sentinel logs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card ssh-card" style={{ display: 'flex', flexDirection: 'column', height: '650px', padding: '24px' }}>
      
      {/* Header & Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <User size={18} color="var(--primary-color)" />
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Access Logs Feed</h3>
      </div>
      
      <LogFilters 
        activeTab={activeTab} setActiveTab={setActiveTab}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        serverFilter={serverFilter} setServerFilter={setServerFilter}
        quickFilter={quickFilter} setQuickFilter={setQuickFilter}
        uniqueServers={uniqueServers}
      />

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        
        {/* Main Event Feed */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} className="custom-scrollbar">
          {filteredEvents.slice(0, visibleCount).map((event, idx) => (
            <SshEventRow 
              key={`${event.rawTs}-${idx}`} 
              event={event} 
              geo={ipGeo[event.ip]} 
              onClick={setSelectedEvent} 
            />
          ))}

          {/* Empty State */}
          {filteredEvents.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No logs match the current filters.
            </div>
          )}

          {/* Infinite Scroll Trigger / Load More Button */}
          {(hasMore || visibleCount < filteredEvents.length) && (
            <div 
              ref={observerTarget}
              style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}
            >
              <button 
                onClick={() => {
                  if (visibleCount < filteredEvents.length) {
                    setVisibleCount(prev => prev + 25);
                  } else if (hasMore && !fetchingOlder) {
                    loadOlderLogs();
                  }
                }}
                disabled={fetchingOlder}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '10px 24px',
                  borderRadius: '24px',
                  color: 'var(--text-color)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: fetchingOlder ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => { if(!fetchingOlder) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { if(!fetchingOlder) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                {fetchingOlder ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                    Loading older events...
                  </>
                ) : 'Load More Events'}
              </button>
            </div>
          )}
          
          {/* End of Data Indicator */}
          {!hasMore && visibleCount >= filteredEvents.length && filteredEvents.length > 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              You have reached the end of the log history.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <ActiveSessionsPanel 
          events={allEvents} 
          ipGeo={ipGeo} 
          topThreat={topThreat} 
        />
      </div>

    </div>
  );
}
