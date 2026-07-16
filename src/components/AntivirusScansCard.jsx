import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Clock, Database, File, RefreshCw, AlertTriangle, CheckCircle, Server } from 'lucide-react';
import { fetchLatestScans } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';

function formatRelativeAge(ts) {
  const diffMs = Date.now() - ts;
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 24) return `${Math.floor(diffH / 24)}d ago`;
  if (diffH > 0) return `${diffH}h ${diffM}m ago`;
  return `${diffM}m ago`;
}

function formatFriendlyDateTime(ts) {
  const dateObj = new Date(ts);
  const now = new Date();
  
  const isToday = dateObj.getDate() === now.getDate() && 
                  dateObj.getMonth() === now.getMonth() && 
                  dateObj.getFullYear() === now.getFullYear();
                  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = dateObj.getDate() === yesterday.getDate() && 
                      dateObj.getMonth() === yesterday.getMonth() && 
                      dateObj.getFullYear() === yesterday.getFullYear();

  const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let datePrefix = '';
  if (isToday) {
    datePrefix = 'Today';
  } else if (isYesterday) {
    datePrefix = 'Yesterday';
  } else {
    datePrefix = dateObj.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  return `${datePrefix} at ${timeString} (${formatRelativeAge(ts)})`;
}

function formatDuration(rawStr) {
  if (!rawStr) return 'N/A';
  const match = rawStr.match(/^([\d.]+)\s*sec/);
  if (!match) return rawStr;
  
  const totalSec = Math.round(parseFloat(match[1]));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ScanCard({ scan }) {
  const infected = scan.infectedFiles > 0;
  const dateObj = new Date(scan.timestamp);
  const scannedNum = parseInt(scan.scannedFiles) || 0;
  const name = getFriendlyName(scan.host);

  let statusColor = 'var(--status-healthy)';
  let statusBorder = 'rgba(255,255,255,0.03)';
  let statusLabel = 'CLEAN';
  let StatusIcon = ShieldCheck;

  if (infected) {
    statusColor = 'var(--status-danger)';
    statusBorder = 'rgba(239,68,68,0.15)';
    statusLabel = 'THREATS FOUND';
    StatusIcon = ShieldAlert;
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.005)',
      border: `1px solid ${statusBorder}`,
      borderRadius: 'var(--radius-md)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>

      {/* Row 1: Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '6px', display: 'flex' }}>
            <StatusIcon size={14} color={statusColor} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{scan.host}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{
            background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', color: statusColor, fontSize: '0.65rem',
            fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-sm)', letterSpacing: '0.04em'
          }}>
            {infected ? `⚠ ${scan.infectedFiles} THREAT${scan.infectedFiles > 1 ? 'S' : ''}` : '✓ ' + statusLabel}
          </span>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} /> {formatFriendlyDateTime(scan.timestamp)}
          </div>
        </div>
      </div>

      {/* Row 2: Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: infected ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: `1px solid ${infected ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)'}` }}>
        {[
          { label: 'Files Scanned', value: scannedNum.toLocaleString(), icon: File, color: 'var(--text-muted)' },
          { label: 'Data Scanned', value: scan.dataScanned || 'N/A', icon: Database, color: '#60a5fa' },
          { label: 'Duration', value: formatDuration(scan.timeTaken), icon: Clock, color: '#a78bfa' },
          { label: 'Engine', value: `ClamAV ${scan.engineVersion || ''}`, icon: Shield, color: statusColor },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.003)', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Icon size={11} color={color} />
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Row 3: Infected files list if any */}
      {infected && scan.infectedFilesList && scan.infectedFilesList.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--status-danger)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={11} /> Detected Threats
          </div>
          {scan.infectedFilesList.slice(0, 4).map((f, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--status-danger)', paddingBottom: '3px', borderBottom: '1px solid rgba(239,68,68,0.05)', marginBottom: '3px' }}>
              {f}
            </div>
          ))}
          {scan.infectedFilesList.length > 4 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--status-danger)' }}>+{scan.infectedFilesList.length - 4} more threats</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AntivirusScansCard() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchLatestScans();
      data.sort((a, b) => {
        if (a.infectedFiles > 0 && b.infectedFiles === 0) return -1;
        if (b.infectedFiles > 0 && a.infectedFiles === 0) return 1;
        return b.timestamp - a.timestamp;
      });
      setScans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const int = setInterval(loadData, 30000);
    return () => clearInterval(int);
  }, []);

  const cleanCount = scans.filter(s => s.infectedFiles === 0).length;
  const infectedCount = scans.filter(s => s.infectedFiles > 0).length;
  const totalFiles = scans.reduce((acc, s) => acc + (parseInt(s.scannedFiles) || 0), 0);
  const totalThreats = scans.reduce((acc, s) => acc + (s.infectedFiles || 0), 0);
  const lastScanAge = scans.length > 0 ? formatRelativeAge(Math.max(...scans.map(s => s.timestamp))) : 'N/A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', paddingBottom: '20px', animation: 'fadeIn 0.4s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Security</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
          <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="var(--text-muted)" /> Antivirus Intelligence
          </h2>
        </div>
        <button onClick={loadData} disabled={loading} style={{ background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)', padding: '5px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, opacity: loading ? 0.6 : 1, fontSize: '0.72rem' }}>
          <RefreshCw size={11} className={loading ? 'spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Fleet Overview Stat Strip (Overview design style: unified cells separated by gap: 1px) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
        {[
          { icon: Server, label: 'Servers Scanned', value: scans.length, color: '#a78bfa', sub: 'nodes registered' },
          { icon: ShieldCheck, label: 'Clean Nodes', value: cleanCount, color: 'var(--status-healthy)', sub: 'no threats detected' },
          { icon: ShieldAlert, label: 'Infected Nodes', value: infectedCount, color: infectedCount > 0 ? 'var(--status-danger)' : 'var(--status-healthy)', sub: infectedCount > 0 ? `${totalThreats} total threat(s)` : 'clean environment' },
          { icon: File, label: 'Total Files Scanned', value: totalFiles.toLocaleString(), color: '#60a5fa', sub: `last scan: ${lastScanAge}` },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.003)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
              <Icon size={14} color={color} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {value}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Fleet security posture banner */}
      <div style={{
        background: totalThreats > 0 ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
        border: `1px solid ${totalThreats > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {totalThreats > 0
          ? <ShieldAlert size={20} color="var(--status-danger)" />
          : <CheckCircle size={20} color="var(--status-healthy)" />
        }
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.82rem', color: totalThreats > 0 ? 'var(--status-danger)' : 'var(--status-healthy)' }}>
            {totalThreats > 0
              ? `⚠ ${totalThreats} active threat${totalThreats > 1 ? 's' : ''} detected across the fleet`
              : '✓ All systems clean — no threats detected across the fleet'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Last scan completed {lastScanAge} · {totalFiles.toLocaleString()} total files covered across {scans.length} server{scans.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Per-server scan cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '16px', overflowY: 'auto', flex: 1, contentVisibility: 'auto', alignItems: 'start', alignContent: 'start' }} className="custom-scrollbar">
        {loading && scans.length === 0 && (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="shimmer-card" style={{ height: '142px' }} />
          ))
        )}
        {!loading && scans.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            No antivirus scan reports found. Make sure ClamAV is installed and the OTel agent is running on your servers.
          </div>
        )}
        {scans.map((scan, i) => <ScanCard key={i} scan={scan} />)}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        button:hover { opacity: 0.95; }
      `}</style>
    </div>
  );
}
