import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, MarkerType, applyNodeChanges, applyEdgeChanges, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { fetchServerMetrics, fetchActiveAlerts } from '../api/signoz';
import { fetchAlerts } from '../api/alerts';
import { getFriendlyName } from '../utils/serverMapping';
import { Network, Server, ShieldAlert, Cpu, MemoryStick, HardDrive, Wifi, RefreshCw, Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

// ─── Custom Node: Gateway Hub ──────────────────────────────────────────────
function HubNode({ data }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--color-hex-1e1b4b), var(--color-hex-312e81))',
      border: '2px solid var(--color-hex-818cf8)',
      borderRadius: '16px',
      padding: '16px 20px',
      minWidth: '160px',
      textAlign: 'center',
      boxShadow: '0 0 30px var(--color-rgb-99-102-241-0-4)',
      color: 'var(--color-hex-fff)',
    }}>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Network size={28} color="var(--color-hex-818cf8)" style={{ marginBottom: '8px' }} />
      <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.05em' }}>GATEWAY HUB</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-hex-a5b4fc)', marginTop: '4px' }}>Mumbai DC · Active</div>
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-hex-4ade80)', animation: `ping ${0.8 + i * 0.3}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Custom Node: Server ───────────────────────────────────────────────────
function ServerNode({ data }) {
  const { name, cpu, mem, disk, status, alerts, load } = data;
  const isOffline = status === 'offline';
  const hasCritical = alerts?.some(a => a.severity === 'critical');
  const hasWarning = alerts?.some(a => a.severity === 'warning');

  let borderColor = 'var(--color-hex-10b981)';
  let glowColor = 'var(--color-rgb-16-185-129-0-3)';
  let statusLabel = 'Online';
  let statusColor = 'var(--color-hex-4ade80)';

  if (isOffline) {
    borderColor = 'var(--color-hex-6b7280)'; glowColor = 'var(--color-rgb-107-114-128-0-2)'; statusLabel = 'Offline'; statusColor = 'var(--color-hex-9ca3af)';
  } else if (hasCritical) {
    borderColor = 'var(--color-hex-ef4444)'; glowColor = 'var(--color-rgb-239-68-68-0-35)'; statusLabel = 'Critical'; statusColor = 'var(--color-hex-f87171)';
  } else if (hasWarning) {
    borderColor = 'var(--color-hex-f59e0b)'; glowColor = 'var(--color-rgb-245-158-11-0-3)'; statusLabel = 'Warning'; statusColor = 'var(--color-hex-fbbf24)';
  }

  const cpuVal = parseFloat(cpu) || 0;
  const memVal = parseFloat(mem) || 0;
  const diskVal = parseFloat(disk) || 0;

  function MiniBar({ value, color }) {
    return (
      <div style={{ height: '4px', background: 'var(--color-rgb-255-255-255-0-08)', borderRadius: '2px', overflow: 'hidden', flex: 1 }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: value > 85 ? 'var(--color-hex-ef4444)' : value > 65 ? 'var(--color-hex-f59e0b)' : color, borderRadius: '2px' }} />
      </div>
    );
  }

  return (
    <div style={{
      background: isOffline ? 'var(--color-hex-111214)' : 'linear-gradient(145deg, var(--color-hex-13141a), var(--color-hex-1c1e27))',
      border: `2px solid ${borderColor}`,
      borderRadius: '14px',
      padding: '14px 16px',
      minWidth: '200px',
      boxShadow: `0 0 20px ${glowColor}`,
      color: 'var(--color-hex-fff)',
      opacity: isOffline ? 0.65 : 1,
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasCritical ? <ShieldAlert size={18} color="var(--color-hex-ef4444)" /> : isOffline ? <XCircle size={18} color="var(--color-hex-6b7280)" /> : <Server size={18} color={borderColor} />}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: '0.65rem', color: statusColor, fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>● {statusLabel}</div>
          </div>
        </div>
        {alerts?.length > 0 && (
          <div style={{ background: 'var(--color-rgb-239-68-68-0-15)', color: 'var(--color-hex-f87171)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', border: '1px solid var(--color-rgb-239-68-68-0-3)' }}>
            {alerts.length} ALERT{alerts.length > 1 ? 'S' : ''}
          </div>
        )}
      </div>

      {/* Metrics */}
      {!isOffline && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={11} color="var(--color-hex-a78bfa)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: '28px' }}>CPU</span>
            <MiniBar value={cpuVal} color="var(--color-hex-a78bfa)" />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cpuVal > 85 ? 'var(--color-hex-ef4444)' : 'var(--color-hex-e2e8f0)', width: '34px', textAlign: 'right' }}>{cpuVal.toFixed(1)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={11} color="var(--color-hex-34d399)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: '28px' }}>RAM</span>
            <MiniBar value={memVal} color="var(--color-hex-34d399)" />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: memVal > 85 ? 'var(--color-hex-ef4444)' : 'var(--color-hex-e2e8f0)', width: '34px', textAlign: 'right' }}>{memVal.toFixed(1)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={11} color="var(--color-hex-60a5fa)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: '28px' }}>DISK</span>
            <MiniBar value={diskVal} color="var(--color-hex-60a5fa)" />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: diskVal > 85 ? 'var(--color-hex-ef4444)' : 'var(--color-hex-e2e8f0)', width: '34px', textAlign: 'right' }}>{diskVal.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Alerts list */}
      {alerts?.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--color-rgb-255-255-255-0-07)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {alerts.slice(0, 2).map((a, i) => (
            <div key={i} style={{ fontSize: '0.65rem', color: a.severity === 'critical' ? 'var(--color-hex-fca5a5)' : 'var(--color-hex-fcd34d)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={9} /> {a.title || a.alertname}
            </div>
          ))}
          {alerts.length > 2 && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{alerts.length - 2} more</div>}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { hub: HubNode, serverNode: ServerNode };

// Fixed positions for a clean layout
const SERVER_POSITIONS = {
  'Oracle database server': { x: 600, y: 100 },
  'Orbithyre':              { x: 600, y: 350 },
  'Gaplytiq':               { x: 50,  y: 100 },
  'Dalai':                  { x: 50,  y: 350 },
};
const HUB_POSITION = { x: 310, y: 220 };

export default function TopologyView() {
  const [nodes, setNodes] = useState([{ id: 'hub', type: 'hub', position: HUB_POSITION, data: {} }]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverData, setServerData] = useState({});

  const onNodesChange = useCallback((changes) => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges(eds => applyEdgeChanges(changes, eds)), []);

  useEffect(() => {
    loadTopology();
    const interval = setInterval(loadTopology, 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadTopology() {
    try {
      const [metrics, internalAlerts] = await Promise.all([
        fetchServerMetrics(),
        fetchAlerts().catch(() => [])
      ]);

      // Build alert map by host
      const alertMap = {};
      internalAlerts.filter(a => a.status === 'active').forEach(a => {
        const h = a.host;
        if (!alertMap[h]) alertMap[h] = [];
        alertMap[h].push(a);
      });

      const serverMap = {};

      if (metrics.success && metrics.cpu) {
        const memMap = {}, diskMap = {};
        (metrics.mem || []).forEach(m => { memMap[m.metric.host_name] = parseFloat(m.value[1]); });
        (metrics.disk || []).forEach(d => { diskMap[d.metric.host_name] = parseFloat(d.value[1]); });

        metrics.cpu.forEach(cpuData => {
          const rawHost = cpuData.metric.host_name;
          const host = getFriendlyName(rawHost);
          serverMap[host] = {
            name: host,
            cpu: parseFloat(cpuData.value[1]),
            mem: memMap[rawHost] || 0,
            disk: diskMap[rawHost] || 0,
            status: 'online',
            alerts: alertMap[host] || [],
          };
        });
      }

      // Build nodes
      const hubNode = { id: 'hub', type: 'hub', position: HUB_POSITION, data: {}, draggable: true };
      const serverNodes = Object.entries(serverMap).map(([name, data]) => ({
        id: name,
        type: 'serverNode',
        position: SERVER_POSITIONS[name] || { x: Math.random() * 500, y: Math.random() * 400 },
        data,
        draggable: true,
      }));

      const hasCritical = (name) => (alertMap[name] || []).some(a => a.severity === 'critical');
      const hasWarning = (name) => (alertMap[name] || []).some(a => a.severity === 'warning');

      const newEdges = Object.keys(serverMap).map(name => {
        const isCrit = hasCritical(name);
        const isWarn = hasWarning(name);
        const edgeColor = isCrit ? 'var(--color-hex-ef4444)' : isWarn ? 'var(--color-hex-f59e0b)' : 'var(--color-hex-10b981)';
        return {
          id: `hub-${name}`,
          source: 'hub',
          target: name,
          animated: !isCrit,
          style: { stroke: edgeColor, strokeWidth: isCrit ? 2.5 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 14, height: 14 },
        };
      });

      setNodes([hubNode, ...serverNodes]);
      setEdges(newEdges);
      setServerData(serverMap);
    } catch (err) {
      console.error('[Topology]', err);
    } finally {
      setLoading(false);
    }
  }

  const onlineCount = Object.values(serverData).filter(s => s.status === 'online').length;
  const alertCount = Object.values(serverData).reduce((acc, s) => acc + (s.alerts?.length || 0), 0);
  const avgCpu = Object.values(serverData).length > 0
    ? (Object.values(serverData).reduce((acc, s) => acc + s.cpu, 0) / Object.values(serverData).length).toFixed(1)
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={24} color="var(--accent)" /> Infrastructure Topology
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Live node map. Edges animate with traffic — sever on critical failure. Drag nodes freely.
          </p>
        </div>
        <button onClick={loadTopology} style={{ background: 'var(--accent)', border: 'none', color: 'var(--color-hex-fff)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { icon: CheckCircle, label: 'Servers Online', value: `${onlineCount} / ${Math.max(onlineCount, 4)}`, color: 'var(--color-hex-10b981)' },
          { icon: ShieldAlert, label: 'Active Alerts', value: alertCount, color: alertCount > 0 ? 'var(--color-hex-ef4444)' : 'var(--color-hex-10b981)' },
          { icon: Cpu, label: 'Fleet Avg CPU', value: `${avgCpu}%`, color: 'var(--color-hex-a78bfa)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: 'var(--color-rgb-0-0-0-0-3)', border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon size={18} color={color} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-hex-fff)' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Flow canvas */}
      <div style={{ flex: 1, minHeight: '520px', background: 'var(--color-hex-0d0e14)', border: '1px solid var(--color-rgb-99-102-241-0-15)', borderRadius: '16px', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: 'var(--color-hex-0d0e14)', borderRadius: '16px' }}
          attributionPosition="bottom-right"
        >
          <Background color="var(--color-hex-1a1c28)" gap={20} size={1} />
          <Controls style={{ background: 'var(--color-hex-1e202c)', border: '1px solid var(--color-hex-2d2f3d)' }} />
        </ReactFlow>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
