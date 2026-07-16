import React from 'react';
import { X, Activity, Clock, Cpu } from 'lucide-react';

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

const getServiceColor = (service) => {
  const hash = service.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

export default function TraceVisualizer({ trace, onClose }) {
  if (!trace) return null;

  const spans = generateSpansForService(trace.service, trace.trace_id);
  const totalDuration = Math.max(...spans.map(s => s.start + s.duration));

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: '450px',
      background: 'var(--bg-card)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      zIndex: 100,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
            <Activity size={14} color="var(--text-secondary)" />
            Distributed Trace
          </h3>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {trace.trace_id}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Total Duration
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
              {totalDuration}ms
            </div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cpu size={12} /> Spans
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
              {spans.length}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', paddingLeft: '14px', borderLeft: '1px solid var(--border-color)' }}>
          {spans.map((span, i) => (
            <div key={span.id} style={{ marginBottom: '12px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-15px', top: '10px', width: '8px', height: '1px', background: 'var(--border-color)' }}></div>
              <div style={{ position: 'absolute', left: '-18px', top: '7px', width: '6px', height: '6px', borderRadius: '50%', background: getServiceColor(span.service) }}></div>
              
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', marginLeft: span.depth * 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>{span.name}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{span.duration}ms</span>
                </div>
                
                <div style={{ height: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, bottom: 0, 
                    left: `${(span.start / totalDuration) * 100}%`,
                    width: `${(span.duration / totalDuration) * 100}%`,
                    background: getServiceColor(span.service),
                    opacity: 0.8,
                    borderRadius: '2px'
                  }}></div>
                </div>
                
                <div style={{ fontSize: '0.65rem', color: getServiceColor(span.service), marginTop: '6px', fontWeight: 600 }}>
                  {span.service}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
