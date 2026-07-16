import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal } from 'lucide-react';
import { useAppLogs } from '../hooks/useAppLogs';
import LogConsoleFilters from './LogConsole/LogConsoleFilters';
import LogConsoleRow from './LogConsole/LogConsoleRow';
import TraceVisualizer from './LogConsole/TraceVisualizer';

export default function LogConsole() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { logs, loading, fetchingOlder, hasMore, isLive, setIsLive, loadOlderLogs, refreshLogs } = useAppLogs(debouncedSearchQuery);

  const [levelFilter, setLevelFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [inspectingTrace, setInspectingTrace] = useState(null);
  
  const [visibleCount, setVisibleCount] = useState(50);
  const observerTarget = useRef(null);
  const consoleEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Reset visibleCount when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [levelFilter, serviceFilter, searchQuery]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading) {
          setVisibleCount(prev => {
            if (prev < logs.length) return prev + 50;
            return prev;
          });
          
          if (hasMore && !fetchingOlder) {
            // Cache scroll height before loading more
            const container = scrollContainerRef.current;
            if (container) {
              container.dataset.prevScrollHeight = container.scrollHeight;
            }
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
  }, [hasMore, fetchingOlder, loading, loadOlderLogs, logs.length]);

  // Preserve scroll position when older logs are loaded at the top
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && container.dataset.prevScrollHeight && !fetchingOlder) {
      const diff = container.scrollHeight - parseInt(container.dataset.prevScrollHeight, 10);
      if (diff > 0) {
        container.scrollTop = diff;
      }
      container.dataset.prevScrollHeight = '';
    }
  }, [logs.length, fetchingOlder]);

  // Scroll to bottom for live tail
  useEffect(() => {
    if (consoleEndRef.current && isLive) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isLive]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
      const matchesService = serviceFilter === 'all' || log.service === serviceFilter;
      const matchesSearch = searchQuery === '' ||
        log.msg?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesService && matchesSearch;
    });
  }, [logs, levelFilter, serviceFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 160px)', position: 'relative' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px', display: 'flex' }}>
            <Terminal size={14} color="var(--text-secondary)" />
          </div>
          <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>Application Telemetry</h3>
        </div>

        <LogConsoleFilters 
          levelFilter={levelFilter} setLevelFilter={setLevelFilter}
          serviceFilter={serviceFilter} setServiceFilter={setServiceFilter}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          isLive={isLive} setIsLive={setIsLive}
          refreshLogs={refreshLogs} loading={loading}
        />

        <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)', marginTop: '12px' }} className="custom-scrollbar">
          
          {loading && logs.length === 0 && (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="shimmer-bar" style={{ width: '80px', height: '14px' }} />
                  <div className="shimmer-bar" style={{ width: '60px', height: '14px' }} />
                  <div className="shimmer-bar" style={{ flex: 1, height: '14px' }} />
                </div>
              ))}
            </div>
          )}

          {!hasMore && visibleCount >= filteredLogs.length && filteredLogs.length > 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              You have reached the end of the log history.
            </div>
          )}

          {(hasMore || visibleCount < filteredLogs.length) && (
            <div 
              ref={observerTarget}
              style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}
            >
              <button 
                onClick={() => {
                  if (visibleCount < filteredLogs.length) {
                    setVisibleCount(prev => prev + 50);
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
                    Loading older logs...
                  </>
                ) : 'Load Older Logs'}
              </button>
            </div>
          )}

          {filteredLogs.slice(Math.max(0, filteredLogs.length - visibleCount)).map((log, idx) => (
            <LogConsoleRow 
              key={`${log.rawTs}-${idx}`} 
              log={log} 
              onClickTrace={setInspectingTrace} 
            />
          ))}

          {filteredLogs.length === 0 && !loading && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No logs match the current filters.
            </div>
          )}

          <div ref={consoleEndRef} style={{ float: 'left', clear: 'both' }}></div>
        </div>
      </div>

      <TraceVisualizer trace={inspectingTrace} onClose={() => setInspectingTrace(null)} />
      
    </div>
  );
}
