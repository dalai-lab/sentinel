import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Search, Trash2, Play, Pause } from 'lucide-react';
import { fetchRealLogs } from '../api/signoz';

const SERVICES = ['all', 'otelcol', 'nginx', 'supabase-auth', 'node_exporter', 'sentinel-backend', 'postgres-db', 'signoz-query', 'sentinel-agent', 'crowdsec'];

export default function LogConsole() {
  const [logs, setLogs] = useState([]);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLive, setIsLive] = useState(true);

  const consoleEndRef = useRef(null);

  const loadLogs = async () => {
    try {
      const now = Date.now();
      const pastHour = now - 60 * 60 * 1000;
      const data = await fetchRealLogs(pastHour, now);
      if (Array.isArray(data)) {
        // Sort by time ascending
        setLogs(data.slice(-100));
      }
    } catch (err) {
      console.error('Failed to load real logs:', err);
    } finally {
      setIsLoading(false);
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

  // Auto-scroll to bottom of terminal when logs load first time or change
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return '#ef4444';
      case 'WARN': return '#f59e0b';
      case 'DEBUG': return '#71717a';
      default: return '#10b981';
    }
  };

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesService = serviceFilter === 'all' || log.service === serviceFilter;
    const matchesSearch = searchQuery === '' ||
      log.msg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesService && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 160px)' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Logs & Traces Console</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Live telemetry log scraper connecting SigNoz otelcol pipelines.</p>
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
            <span>{isLive ? 'LIVE TAIL ON' : 'PAUSED'}</span>
          </button>

          <button
            onClick={clearLogs}
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
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="dashboard-card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
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
            placeholder="Search console events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>

        {/* Level filter */}
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

        {/* Service filter */}
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

      {/* Terminal Output */}
      <div
        className="dashboard-card text-mono"
        style={{
          flex: 1,
          background: '#09090b',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '8px' }}>
          <Terminal size={14} color="var(--accent)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SigNoz Exporter Output Stream</span>
        </div>

        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '12px',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                alignItems: 'flex-start'
              }}
            >
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{log.time}]</span>

              <span style={{
                color: getLevelColor(log.level),
                fontWeight: 700,
                flexShrink: 0,
                width: '50px'
              }}>
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

              <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {log.msg}
              </span>
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
    </div>
  );
}
