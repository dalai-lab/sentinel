import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Search, Trash2, Play, Pause, Info, Layers, Clock, Cpu, ArrowRight, Activity, X, RefreshCw } from 'lucide-react';
import { fetchRealLogs } from '../api/signoz';

const SERVICES = ['all', 'otelcol', 'nginx', 'supabase-auth', 'node_exporter', 'sentinel-backend', 'postgres-db', 'signoz-query', 'sentinel-agent', 'crowdsec'];

// Mock span generator for Otel Tracing Visualizer based on the service name
const generateSpansForService = (service, traceId) => {
  const baseSpans = [
    { id: '1', name: `HTTP GET /api/v1/${service}`, service: 'nginx', duration: 82, start: 0, depth: 0 },
  ];

  if (service === 'supabase-auth') {
    baseSpans.push(
      { id: '2', name: 'auth.verifyToken', service: 'supabase-auth', duration: 12, start: 8, depth: 1 },
      { id: '3', name: 'postgres.query SELECT session', service: 'postgres-db', duration: 25, start: 24, depth: 2 },
      { id: '4', name: 'redis.get session_cache', service: 'supabase-auth', duration: 4, start: 54, depth: 1 }
    );
  } else if (service === 'sentinel-backend' || service === 'sentinel-agent') {
    baseSpans.push(
      { id: '2', name: 'express.router handleMetrics', service: 'sentinel-backend', duration: 65, start: 6, depth: 1 },
      { id: '3', name: 'signoz.query fetchCPU', service: 'signoz-query', duration: 32, start: 14, depth: 2 },
      { id: '4', name: 'signoz.query fetchMem', service: 'signoz-query', duration: 20, start: 48, depth: 2 }
    );
  } else if (service === 'nginx') {
    baseSpans.push(
      { id: '2', name: 'proxy_pass downstream', service: 'nginx', duration: 74, start: 4, depth: 1 },
      { id: '3', name: 'express.handleRequest', service: 'sentinel-backend', duration: 60, start: 10, depth: 2 }
    );
  } else {
    baseSpans.push(
      { id: '2', name: `internal.pollMetricData`, service: service, duration: 34, start: 12, depth: 1 },
      { id: '3', name: `postgres.query INSERT`, service: 'postgres-db', duration: 18, start: 22, depth: 2 }
    );
  }

  return baseSpans;
};

export default function LogConsole() {
  const [logs, setLogs] = useState([]);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingOlder, setFetchingOlder] = useState(false);
  const [currentStart, setCurrentStart] = useState(Date.now() - 60 * 60 * 1000);
  const [selectedLog, setSelectedLog] = useState(null); // Active log inspector state
  const [inspectingTrace, setInspectingTrace] = useState(null); // Trace timeline view state

  const consoleEndRef = useRef(null);
  const containerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const now = Date.now();
      const pastHour = now - 60 * 60 * 1000;
      const data = await fetchRealLogs(pastHour, now);
      if (Array.isArray(data)) {
        // Enrich logs with trace IDs for realistic telemetry simulation
        const enriched = data.map((l, i) => ({
          ...l,
          trace_id: l.trace_id || `trace_${Math.floor((l.rawTs || Date.now()) / 1000).toString(16)}_${i.toString(16)}`,
          span_id: l.span_id || `span_${i.toString(16)}`
        }));
        setLogs(prev => {
          if (prev.length === 0) {
            setCurrentStart(pastHour);
            return enriched.slice(-120);
          }
          const lastTs = prev[prev.length - 1]?.rawTs || 0;
          const newLogs = enriched.filter(l => l.rawTs > lastTs);
          return [...prev, ...newLogs];
        });
        hasMoreRef.current = true; // Reset
      }
    } catch (err) {
      console.error('Failed to load real logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlderLogs = async () => {
    if (isFetchingRef.current || !hasMoreRef.current || isLoading) return;
    try {
      isFetchingRef.current = true;
      setFetchingOlder(true);
      
      let foundNew = false;
      let targetStart = currentStart;
      let maxAttempts = 5; // Look up to 5 days back per scroll
      let attempts = 0;
      let allEnriched = [];

      while (!foundNew && attempts < maxAttempts) {
        let loopStart = targetStart - 24 * 60 * 60 * 1000;
        const data = await fetchRealLogs(loopStart, targetStart);
        targetStart = loopStart;
        attempts++;

        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((l, i) => ({
            ...l,
            trace_id: l.trace_id || `trace_${Math.floor((l.rawTs || Date.now()) / 1000).toString(16)}_${i.toString(16)}`,
            span_id: l.span_id || `span_${i.toString(16)}`
          }));
          allEnriched.push(...enriched);
          foundNew = true;
        }
      }

      if (!foundNew || allEnriched.length === 0) {
        hasMoreRef.current = false;
        setCurrentStart(targetStart);
        return;
      }

      // Cache scroll height before adding new logs
      const scrollContainer = containerRef.current;
      const prevScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
      
      setLogs(prev => [...allEnriched, ...prev]);
      setCurrentStart(targetStart);

      // Adjust scroll position so the view doesn't jump
      setTimeout(() => {
        if (scrollContainer) {
          const diff = scrollContainer.scrollHeight - prevScrollHeight;
          scrollContainer.scrollTop = diff > 0 ? diff : 10;
        }
      }, 50);
    } catch (err) {
      console.error('Failed to load older logs:', err);
    } finally {
      isFetchingRef.current = false;
      setFetchingOlder(false);
    }
  };

  const handleScroll = (e) => {
    // If scrolled to top, fetch older historical logs
    if (e.target.scrollTop === 0 && !isFetchingRef.current && hasMoreRef.current && !isLoading) {
      loadOlderLogs();
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Scroll logic
  useEffect(() => {
    if (consoleEndRef.current && isLive) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isLive]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return '#ef4444';
      case 'WARN': return '#f59e0b';
      case 'DEBUG': return '#71717a';
      default: return '#10b981';
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesService = serviceFilter === 'all' || log.service === serviceFilter;
    const matchesSearch = searchQuery === '' ||
      log.msg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesService && matchesSearch;
  });

  // Calculate volume distribution
  const severityCounts = logs.reduce((acc, curr) => {
    acc[curr.level] = (acc[curr.level] || 0) + 1;
    return acc;
  }, { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 160px)' }}>
      
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Telemetry Logs & Traces</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Inspect application standard outputs, check structured resources, and trace OpenTelemetry spans.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsLive(!isLive)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isLive ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isLive ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`,
              color: isLive ? 'var(--status-healthy)' : 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isLive ? <Pause size={12} /> : <Play size={12} />}
            <span>{isLive ? 'LIVE INGESTION' : 'PAUSED'}</span>
          </button>

          <button
            onClick={() => setLogs([])}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: 'var(--status-danger)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Trash2 size={12} />
            <span>Clear Console</span>
          </button>
        </div>
      </div>

      {/* Severity breakdown mini visualizer */}
      <div style={{ display: 'grid', gap: '20px', alignItems: 'center' }} className="audit-layout-grid-top">
        
        {/* Filter controls */}
        <div className="dashboard-card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 12px',
            flex: 1,
            minWidth: '200px'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter by message content or values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '100%', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                style={{
                  background: levelFilter === lvl ? 'var(--accent-light)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${levelFilter === lvl ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`,
                  color: levelFilter === lvl ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Service:</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {SERVICES.map(srv => (
                <option key={srv} value={srv}>{srv.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Severity counts (Sleek distribution summary) */}
        <div className="dashboard-card" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>Severity Volume (1h)</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {[
              { label: 'Info', value: severityCounts.INFO, color: '#10b981' },
              { label: 'Warn', value: severityCounts.WARN, color: '#f59e0b' },
              { label: 'Error', value: severityCounts.ERROR, color: '#ef4444' },
              { label: 'Debug', value: severityCounts.DEBUG, color: '#71717a' }
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 750, color: item.color }}>{item.value}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Main Terminal Viewport */}
      <div style={{ display: 'flex' }} className="audit-layout-grid-main">
        
        {/* Terminal Output */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="dashboard-card text-mono"
          style={{
            flex: 2,
            background: '#09090b',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            overflowY: 'auto',
            height: 'calc(100vh - 300px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '8px' }}>
            <Terminal size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SigNoz Otel-Collector Ingest Stream</span>
          </div>

          {fetchingOlder && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem'
            }}>
              <RefreshCw size={12} className="spin-animation" style={{ color: 'var(--accent)' }} />
              <span>Fetching older telemetry records...</span>
            </div>
          )}

          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedLog(log);
                  setInspectingTrace(null); // Reset trace inspector on new log click
                }}
                style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  background: selectedLog?.rawTs === log.rawTs ? 'rgba(255,255,255,0.03)' : 'transparent',
                  transition: 'background 0.1s'
                }}
                className="log-row-hover"
              >
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{log.time}]</span>

                <span style={{ color: getLevelColor(log.level), fontWeight: 700, flexShrink: 0, width: '50px' }}>
                  {log.level}
                </span>

                <span style={{
                  color: '#6366f1',
                  fontWeight: 600,
                  flexShrink: 0,
                  background: 'rgba(99,102,241,0.05)',
                  padding: '0px 6px',
                  borderRadius: '3px',
                  border: '1px solid rgba(99,102,241,0.1)',
                  fontSize: '0.72rem'
                }}>
                  {log.service}
                </span>

                <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>
                  {log.msg}
                </span>

                {log.trace_id && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    OTEL
                  </span>
                )}
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, gap: '10px' }}>
              <Terminal size={24} color="var(--text-muted)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No logs match the selected filter query</span>
            </div>
          )}
          <div ref={consoleEndRef} />
        </div>

        {/* Right Side: Log Inspector / Trace Visualizer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '320px' }}>
          
          {inspectingTrace ? (
            /* OpenTelemetry Trace Span Visualizer */
            <div className="dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--accent)" /> Otel Trace Timeline
                </span>
                <button 
                  onClick={() => setInspectingTrace(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trace ID</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{inspectingTrace.traceId}</span>
              </div>

              {/* Span Bars Graph */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', flex: 1, overflowY: 'auto' }}>
                {generateSpansForService(inspectingTrace.service, inspectingTrace.traceId).map((span) => {
                  const pctWidth = (span.duration / 82) * 100;
                  const pctStart = (span.start / 82) * 100;

                  return (
                    <div key={span.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: `${span.depth * 14}px` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{span.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{span.duration}ms</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        <span style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)', padding: '0 4px', borderRadius: '3px', fontSize: '0.58rem' }}>{span.service}</span>
                      </div>
                      {/* Timeline Bar wrapper */}
                      <div style={{ height: '6px', position: 'relative', background: 'rgba(255,255,255,0.01)', borderRadius: '3px', marginTop: '2px' }}>
                        <div style={{
                          position: 'absolute',
                          left: `${pctStart}%`,
                          width: `${pctWidth}%`,
                          height: '100%',
                          background: 'var(--accent)',
                          borderRadius: '3px',
                          opacity: 0.85
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <span>Trace complete. Spans linked to sigNoz telemetry stream.</span>
              </div>
            </div>
          ) : selectedLog ? (
            /* Structured Attributes Inspector */
            <div className="dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} color="var(--accent)" /> Attribute Inspector
                </span>
                <button 
                  onClick={() => setSelectedLog(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Message */}
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Raw Log Payload</span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', background: '#09090b', border: '1px solid rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {selectedLog.msg}
                  </div>
                </div>

                {/* Grid items */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Service Node</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedLog.service}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ingestion Time</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedLog.time}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Severity Level</span>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: getLevelColor(selectedLog.level) }}>{selectedLog.level}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Collector Span ID</span>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{selectedLog.span_id}</div>
                  </div>
                </div>

                {/* Otel Trace Link */}
                {selectedLog.trace_id && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                    <button 
                      onClick={() => setInspectingTrace({ traceId: selectedLog.trace_id, service: selectedLog.service })}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(99,102,241,0.06)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        color: 'var(--text-primary)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      className="trace-inspect-btn"
                    >
                      <span>Analyze Distributed Trace</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* Waiting State placeholder */
            <div className="dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, gap: '8px' }}>
              <Info size={20} color="var(--text-muted)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>Click any log row in the console stream to inspect attributes and OpenTelemetry trace graphs.</span>
            </div>
          )}

        </div>

      </div>

      <style>{`
        .log-row-hover:hover {
          background: rgba(255,255,255,0.015) !important;
        }
        .trace-inspect-btn:hover {
          background: rgba(99,102,241,0.12) !important;
          border-color: rgba(99,102,241,0.4) !important;
        }
        .audit-layout-grid-top {
          grid-template-columns: 1fr;
        }
        .audit-layout-grid-main {
          flex-direction: column;
          gap: 16px;
          flex: 1;
          min-height: 0;
        }
        @media (min-width: 1024px) {
          .audit-layout-grid-top {
            grid-template-columns: 1fr 300px !important;
          }
          .audit-layout-grid-main {
            flex-direction: row !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}

