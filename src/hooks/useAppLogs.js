import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchRealLogs } from '../api/signoz';

export function useAppLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingOlder, setFetchingOlder] = useState(false);
  const [currentStart, setCurrentStart] = useState(Date.now() - 60 * 60 * 1000); // Past hour
  const [isLive, setIsLive] = useState(true);

  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadLogs = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      setLoading(true);
      const now = Date.now();
      const pastHour = now - 60 * 60 * 1000;
      const data = await fetchRealLogs(pastHour, now);
      
      if (Array.isArray(data)) {
        const enriched = data.map((l, i) => {
          let rawTs = l.rawTs || l.time || l.timestamp;
          if (typeof rawTs === 'string' && isNaN(Number(rawTs))) {
            rawTs = new Date(rawTs).getTime();
          } else if (rawTs && String(rawTs).length >= 18) {
            try { rawTs = Math.floor(Number(BigInt(rawTs) / 1000000n)); } 
            catch (e) { rawTs = Number(rawTs); }
          } else if (rawTs) {
            rawTs = Number(rawTs);
          }
          return {
            ...l,
            rawTs,
            trace_id: l.trace_id || `trace_${Math.floor((rawTs || Date.now()) / 1000).toString(16)}_${i.toString(16)}`,
            span_id: l.span_id || `span_${i.toString(16)}`
          };
        }).sort((a, b) => a.rawTs - b.rawTs); // Sort oldest first (ascending, newest at bottom)
        
        setLogs(prev => {
          if (prev.length === 0) {
            if (enriched.length > 0) setCurrentStart(enriched[enriched.length - 1].rawTs);
            return enriched;
          }
          const seen = new Set(prev.map(p => `${p.rawTs}-${p.trace_id}`));
          const newLogs = enriched.filter(l => !seen.has(`${l.rawTs}-${l.trace_id}`));
          return [...prev, ...newLogs].sort((a, b) => a.rawTs - b.rawTs);
        });
        hasMoreRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load real logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOlderLogs = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current || loading) return;
    try {
      isFetchingRef.current = true;
      setFetchingOlder(true);
      
      const targetStart = currentStart - 24 * 60 * 60 * 1000;
      const data = await fetchRealLogs(targetStart, currentStart);
      
      if (!Array.isArray(data) || data.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      const enriched = data.map((l, i) => {
        let rawTs = l.rawTs || l.time || l.timestamp;
        if (typeof rawTs === 'string' && isNaN(Number(rawTs))) {
          rawTs = new Date(rawTs).getTime();
        } else if (rawTs && String(rawTs).length >= 18) {
          try { rawTs = Math.floor(Number(BigInt(rawTs) / 1000000n)); } 
          catch (e) { rawTs = Number(rawTs); }
        } else if (rawTs) {
          rawTs = Number(rawTs);
        }
        return {
          ...l,
          rawTs,
          trace_id: l.trace_id || `trace_${Math.floor((rawTs || Date.now()) / 1000).toString(16)}_${i.toString(16)}`,
          span_id: l.span_id || `span_${i.toString(16)}`
        };
      });

      setLogs(prev => {
        const seen = new Set(prev.map(p => `${p.rawTs}-${p.trace_id}`));
        const newLogs = enriched.filter(l => !seen.has(`${l.rawTs}-${l.trace_id}`));
        
        if (newLogs.length === 0) {
          hasMoreRef.current = false;
          return prev;
        }

        const sortedNew = newLogs.sort((a, b) => a.rawTs - b.rawTs);
        setCurrentStart(sortedNew[0].rawTs); // oldest timestamp is now at index 0
        return [...sortedNew, ...prev].sort((a, b) => a.rawTs - b.rawTs);
      });
      
    } catch (err) {
      console.error('Failed to load older logs:', err);
    } finally {
      isFetchingRef.current = false;
      setFetchingOlder(false);
    }
  }, [currentStart, loading]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [isLive, loadLogs]);

  return {
    logs,
    loading,
    fetchingOlder,
    hasMore: hasMoreRef.current,
    isLive,
    setIsLive,
    loadOlderLogs,
    refreshLogs: loadLogs
  };
}


