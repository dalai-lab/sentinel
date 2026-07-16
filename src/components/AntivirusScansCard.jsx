import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Clock, Database, File, RefreshCw, AlertTriangle, CheckCircle, Server } from 'lucide-react';
import { fetchLatestScans } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';

function formatAge(ts) {
  const diffMs = Date.now() - ts;
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.floor((diffMs % 3600000) / 60000);
  if (diffH > 24) return `${Math.floor(diffH / 24)}d ago`;
  if (diffH > 0) return `${diffH}h ${diffM}m ago`;
  return `${diffM}m ago`;
}

function GaugeMeter({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="5" />
        <circle
          cx="27" cy="27" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="27" y="31" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="700">{pct}%</text>
      </svg>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function ScanCard({ scan }) {
  const infected = scan.infectedFiles > 0;
  const dateObj = new Date(scan.timestamp);
  const scannedNum = parseInt(scan.scannedFiles) || 0;
  const name = getFriendlyName(scan.host);

  let statusColor = 'var(--status-healthy)';
  let statusBorder = 'rgba(16,185,129,0.2)';
  let statusLabel = 'CLEAN';
  let StatusIcon = ShieldCheck;

  if (infected) {
    statusColor = 'var(--status-danger)';
    statusBorder = 'rgba(239,68,68,0.2)';
    statusLabel = 'THREATS FOUND';
    StatusIcon = ShieldAlert;
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${statusBorder}`,
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>

      {/* Row 1: Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px', display: 'flex' }}>
            <StatusIcon size={14} color={statusColor} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{scan.host}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{
            background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', color: statusColor, fontSize: '0.65rem',
            fontWeight: 600, padding: '2px 8px', borderRadius: '3px', letterSpacing: '0.04em'
          }}>
            {infected ? `⚠ ${scan.infectedFiles} THREAT${scan.infectedFiles > 1 ? 'S' : ''}` : '✓ ' + statusLabel}
          </span>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} /> {formatAge(scan.timestamp)} · {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Row 2: Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: 'Files Scanned', value: scannedNum.toLocaleString(), icon: File, color: 'var(--text-muted)' },
          { label: 'Data Scanned', value: scan.dataScanned || 'N/A', icon: Database, color: '#60a5fa' },
          { label: 'Duration', value: scan.timeTaken || 'N/A', icon: Clock, color: '#a78bfa' },
          { label: 'Engine', value: `ClamAV ${scan.engineVersion || ''}`, icon: Shield, color: statusColor },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Icon size={11} color={color} />
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Row 3: Infected files list if any */}
      {infected && scan.infectedFilesList && scan.infectedFilesList.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '4px', padding: '10px 12px' }}>
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
  const lastScanAge = scans.length > 0 ? formatAge(Math.max(...scans.map(s => s.timestamp))) : 'N/A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', paddingBottom: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Shield size={18} color="var(--text-secondary)" /> Fleet Antivirus Intelligence
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            ClamAV scan reports across all servers — threats, coverage, and timeline.
          </p>
        </div>
        <button onClick={loadData} disabled={loading} style={{ background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, opacity: loading ? 0.6 : 1, fontSize: '0.72rem' }}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Fleet overview stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {[
          { icon: Server, label: 'Servers Scanned', value: scans.length, color: '#a78bfa' },
          { icon: ShieldCheck, label: 'Clean', value: cleanCount, color: 'var(--status-healthy)' },
          { icon: ShieldAlert, label: 'Infected', value: infectedCount, color: infectedCount > 0 ? 'var(--status-danger)' : 'var(--status-healthy)' },
          { icon: File, label: 'Total Files Scanned', value: totalFiles.toLocaleString(), color: '#60a5fa' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px', flexShrink: 0 }}>
              <Icon size={14} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fleet security posture banner */}
      <div style={{
        background: totalThreats > 0 ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
        border: `1px solid ${totalThreats > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {totalThreats > 0
          ? <ShieldAlert size={22} color="var(--status-danger)" />
          : <CheckCircle size={22} color="var(--status-healthy)" />
        }
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: totalThreats > 0 ? 'var(--status-danger)' : 'var(--status-healthy)' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '16px', overflowY: 'auto', flex: 1, contentVisibility: 'auto' }} className="custom-scrollbar">
        {loading && scans.length === 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)', gap: '12px' }}>
            <RefreshCw size={16} className="spin" /> Loading antivirus reports…
          </div>
        )}
        {!loading && scans.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            No antivirus scan reports found. Make sure ClamAV is installed and the OTel agent is running on your servers.
          </div>
        )}
        {scans.map((scan, i) => <ScanCard key={i} scan={scan} />)}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        button:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
