import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchRealLogs, fetchIpInfo } from '../api/signoz';
import { parseSshEvent, parseCrowdSecEvent } from '../utils/logParsers';

export function useSshLogs() {
  const [allEvents, setAllEvents] = useState([]);
  const [crowdSecEvents, setCrowdSecEvents] = useState([]);
  const [ipGeo, setIpGeo] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchingOlder, setFetchingOlder] = useState(false);
  
  // Initialize to 24 hours ago
  const [currentStart, setCurrentStart] = useState(Date.now() - 24 * 60 * 60 * 1000);
  
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Helper to chunk arrays
  const chunkArray = (array, size) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };

  const lookupIps = async (ips) => {
    const uncached = ips.filter(ip => !ipGeo[ip]);
    if (uncached.length === 0) return;

    try {
      const chunks = chunkArray(uncached, 100);
      for (const chunk of chunks) {
        const results = await fetchIpInfo(chunk);
        if (results && typeof results === 'object') {
          setIpGeo(prev => ({ ...prev, ...results }));
        }
      }
    } catch (err) {
      console.error('Failed to lookup IPs:', err);
    }
  };

  const loadInitialLogs = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    hasMoreRef.current = true;

    try {
      const now = Date.now();
      const past24h = now - 24 * 60 * 60 * 1000;
      const rawLogs = await fetchRealLogs(past24h, now, 'ssh');
      
      if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const parsedSsh = rawLogs.map(log => parseSshEvent(log)).filter(Boolean);
      const parsedCs = rawLogs.map(log => parseCrowdSecEvent(log)).filter(Boolean);

      // Deduplicate SSH
      const seenSsh = new Set();
      const dedupedSsh = [];
      for (const item of parsedSsh) {
        const key = `${item.rawTs}-${item.user}-${item.ip}-${item.status}`;
        if (!seenSsh.has(key)) { seenSsh.add(key); dedupedSsh.push(item); }
      }

      // Deduplicate CS
      const seenCs = new Set();
      const dedupedCs = [];
      for (const item of parsedCs) {
        const key = `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`;
        if (!seenCs.has(key)) { seenCs.add(key); dedupedCs.push(item); }
      }

      const sortedSsh = dedupedSsh.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
      const sortedCs = dedupedCs.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));

      setAllEvents(sortedSsh);
      setCrowdSecEvents(sortedCs);

      const allParsed = [...dedupedSsh, ...dedupedCs];
      if (allParsed.length > 0) {
        const oldestTs = Math.min(...allParsed.map(e => e.rawTs));
        setCurrentStart(oldestTs);
      }

      const allUniqueIps = [...new Set([
        ...sortedSsh.map(e => e.ip),
        ...sortedCs.map(e => e.ip)
      ])].filter(Boolean);
      
      lookupIps(allUniqueIps);
    } catch (err) {
      console.error('Failed to load initial SSH logs:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const loadOlderLogs = async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    
    isFetchingRef.current = true;
    setFetchingOlder(true);
    
    try {
      const targetStart = currentStart - 7 * 24 * 60 * 60 * 1000;
      const rawLogs = await fetchRealLogs(targetStart, currentStart, 'ssh');
      
      if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      const parsedSsh = rawLogs.map(log => parseSshEvent(log)).filter(Boolean);
      const parsedCs = rawLogs.map(log => parseCrowdSecEvent(log)).filter(Boolean);

      if (parsedSsh.length === 0 && parsedCs.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      // Deduplicate against existing events
      const newSsh = [];
      setAllEvents(prev => {
        const existingSshKeys = new Set(prev.map(item => `${item.rawTs}-${item.user}-${item.ip}-${item.status}`));
        for (const item of parsedSsh) {
          const key = `${item.rawTs}-${item.user}-${item.ip}-${item.status}`;
          if (!existingSshKeys.has(key)) {
            existingSshKeys.add(key);
            newSsh.push(item);
          }
        }
        const sortedNewSsh = newSsh.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
        return [...prev, ...sortedNewSsh];
      });

      const newCs = [];
      setCrowdSecEvents(prev => {
        const existingCsKeys = new Set(prev.map(item => `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`));
        for (const item of parsedCs) {
          const key = `${item.rawTs}-${item.ip}-${item.action}-${item.scenario}`;
          if (!existingCsKeys.has(key)) {
            existingCsKeys.add(key);
            newCs.push(item);
          }
        }
        const sortedNewCs = newCs.sort((a, b) => (a.rawTs < b.rawTs ? 1 : a.rawTs > b.rawTs ? -1 : 0));
        return [...prev, ...sortedNewCs];
      });

      if (newSsh.length === 0 && newCs.length === 0) {
        hasMoreRef.current = false;
        return;
      }

      const allNewParsed = [...newSsh, ...newCs];
      if (allNewParsed.length > 0) {
        const oldestTs = Math.min(...allNewParsed.map(e => e.rawTs));
        setCurrentStart(oldestTs);
      } else {
        setCurrentStart(targetStart);
      }

      const allUniqueIps = [...new Set([
        ...newSsh.map(e => e.ip),
        ...newCs.map(e => e.ip)
      ])].filter(Boolean);
      
      lookupIps(allUniqueIps);
    } catch (err) {
      console.error('Failed to load older SSH logs:', err);
    } finally {
      setFetchingOlder(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadInitialLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    allEvents,
    crowdSecEvents,
    ipGeo,
    loading,
    fetchingOlder,
    hasMore: hasMoreRef.current,
    loadOlderLogs,
    refreshLogs: loadInitialLogs
  };
}
