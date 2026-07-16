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
    else if (activeTab === 'security alerts') combined = crowdSecEvents.filter(e => !e.isWhitelisted);

    // Apply Filters
    let result = combined.filter(e => {
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

    // ── Collapse Triggered Alert + Whitelisted pairs for the same IP ──────────
    // If CrowdSec flagged an IP and then immediately whitelisted it (same IP),
    // those two events are really one thing: "CDN traffic, auto-cleared".
    // Merging avoids showing a scary alert for something harmless.
    if (activeTab === 'all') {
      const whitelistedIps = new Set(
        result.filter(e => e.isWhitelisted).map(e => e.ip)
      );
      result = result.map(e => {
        if (e.action === 'Triggered Alert' && whitelistedIps.has(e.ip)) {
          // Convert this event into a collapsed auto-cleared CDN row
          return { ...e, isWhitelisted: true, action: 'Banned (Whitelisted)', _collapsedCdn: true };
        }
        return e;
      });
      // Now deduplicate: remove standalone Whitelisted rows whose IP was already collapsed
      const collapsedIps = new Set(result.filter(e => e._collapsedCdn).map(e => e.ip));
      result = result.filter(e => !(e.isWhitelisted && !e._collapsedCdn && collapsedIps.has(e.ip)));
    }

    return result;
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
      <div className="ssh-logins-layout shimmer">
        <div className="shimmer-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="shimmer-bar" style={{ width: '80px', height: '24px' }} />
            <div className="shimmer-bar" style={{ width: '100px', height: '24px' }} />
          </div>
          <div className="shimmer-bar" style={{ width: '100%', height: '36px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '10px', width: '40%' }}>
                  <div className="shimmer-bar" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                  <div className="shimmer-bar" style={{ width: '70%', height: '12px' }} />
                </div>
                <div className="shimmer-bar" style={{ width: '20%', height: '12px' }} />
                <div className="shimmer-bar" style={{ width: '15%', height: '12px' }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="shimmer-card" style={{ height: '240px' }} />
          <div className="shimmer-card" style={{ flex: 1 }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', animation: 'fadeIn 0.4s ease' }}>
      
      {/* Page Header */}
      <div className="ssh-header">
        <div className="ssh-breadcrumbs">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Security</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logins</span>
        </div>
        <div className="ssh-title-row">
          <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap' }}>SSH Access Logs</h2>
        </div>
      </div>
      
      <LogFilters 
        activeTab={activeTab} setActiveTab={setActiveTab}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        serverFilter={serverFilter} setServerFilter={setServerFilter}
        quickFilter={quickFilter} setQuickFilter={setQuickFilter}
        uniqueServers={uniqueServers}
      />

      <div className="ssh-logins-layout">
        
        {/* Main Event Feed */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.005)' }} className="custom-scrollbar">
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
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
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
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  cursor: fetchingOlder ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                {fetchingOlder ? (
                  <>
                    <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '1.5px' }}></div>
                    Loading older events...
                  </>
                ) : 'Load More Events'}
              </button>
            </div>
          )}
          
          {/* End of Data Indicator */}
          {!hasMore && visibleCount >= filteredEvents.length && filteredEvents.length > 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
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
