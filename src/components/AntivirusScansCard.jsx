import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Clock, Database, File, RefreshCw, AlertTriangle, CheckCircle, Activity, Cpu, Server } from 'lucide-react';
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
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="27" cy="27" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="27" y="31" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">{pct}%</text>
      </svg>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function ScanCard({ scan, index }) {
  const infected = scan.infectedFiles > 0;
  const dateObj = new Date(scan.timestamp);
  const scannedNum = parseInt(scan.scannedFiles) || 0;
  const name = getFriendlyName(scan.host);

  let statusColor = '#10b981';
  let statusBg = 'rgba(16,185,129,0.08)';
  let statusBorder = 'rgba(16,185,129,0.2)';
  let statusLabel = 'CLEAN';
  let StatusIcon = ShieldCheck;

  if (infected) {
    statusColor = '#ef4444';
    statusBg = 'rgba(239,68,68,0.08)';
    statusBorder = 'rgba(239,68,68,0.25)';
    statusLabel = 'THREATS FOUND';
    StatusIcon = ShieldAlert;
  }

  return (
    <div style={{
      background: infected ? 'linear-gradient(145deg, #1a0d0d, #1c1214)' : 'linear-gradient(145deg, #0e1410, #13181a)',
      border: `1px solid ${statusBorder}`,
      borderLeft: `4px solid ${statusColor}`,
      borderRadius: '14px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      boxShadow: infected ? '0 0 20px rgba(239,68,68,0.08)' : 'none',
    }}>

      {/* Row 1: Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: statusBg, border: `1px solid ${statusBorder}`, borderRadius: '10px', padding: '10px' }}>
            <StatusIcon size={22} color={statusColor} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>{name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '3px' }}>{scan.host}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <span style={{
            background: statusBg, color: statusColor, fontSize: '0.72rem',
            fontWeight: 800, padding: '4px 10px', borderRadius: '20px',
            border: `1px solid ${statusBorder}`, letterSpacing: '0.06em'
          }}>
            {infected ? `⚠ ${scan.infectedFiles} THREAT${scan.infectedFiles > 1 ? 'S' : ''}` : '✓ ' + statusLabel}
          </span>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} /> {formatAge(scan.timestamp)} · {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Row 2: Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Files Scanned', value: scannedNum.toLocaleString(), icon: File, color: '#94a3b8' },
          { label: 'Data Scanned', value: scan.dataScanned || 'N/A', icon: Database, color: '#60a5fa' },
          { label: 'Duration', value: scan.timeTaken || 'N/A', icon: Clock, color: '#a78bfa' },
          { label: 'Engine', value: `ClamAV ${scan.engineVersion || ''}`, icon: Shield, color: statusColor },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Icon size={13} color={color} />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Row 3: Infected files list if any */}
      {infected && scan.infectedFilesList && scan.infectedFilesList.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} /> Detected Threats
          </div>
          {scan.infectedFilesList.slice(0, 4).map((f, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#fca5a5', paddingBottom: '4px', borderBottom: '1px solid rgba(239,68,68,0.1)', marginBottom: '4px' }}>
              {f}
            </div>
          ))}
          {scan.infectedFilesList.length > 4 && (
            <div style={{ fontSize: '0.72rem', color: '#f87171' }}>+{scan.infectedFilesList.length - 4} more threats</div>
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
          <h2 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} color="var(--accent)" /> Fleet Antivirus Intelligence
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ClamAV scan reports across all servers — threats, coverage, and timeline.
          </p>
        </div>
        <button onClick={loadData} disabled={loading} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Fleet overview stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { icon: Server, label: 'Servers Scanned', value: scans.length, color: '#a78bfa' },
          { icon: ShieldCheck, label: 'Clean', value: cleanCount, color: '#10b981' },
          { icon: ShieldAlert, label: 'Infected', value: infectedCount, color: infectedCount > 0 ? '#ef4444' : '#10b981' },
          { icon: File, label: 'Total Files Scanned', value: totalFiles.toLocaleString(), color: '#60a5fa' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: `${color}18`, borderRadius: '8px', padding: '8px', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fleet security posture banner */}
      <div style={{
        background: totalThreats > 0 ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.05))' : 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))',
        border: `1px solid ${totalThreats > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.2)'}`,
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        {totalThreats > 0
          ? <ShieldAlert size={28} color="#ef4444" />
          : <CheckCircle size={28} color="#10b981" />
        }
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: totalThreats > 0 ? '#f87171' : '#4ade80' }}>
            {totalThreats > 0
              ? `⚠ ${totalThreats} active threat${totalThreats > 1 ? 's' : ''} detected across the fleet`
              : '✓ All systems clean — no threats detected across the fleet'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Last scan completed {lastScanAge} · {totalFiles.toLocaleString()} total files covered across {scans.length} server{scans.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Per-server scan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
        {loading && scans.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)', gap: '12px' }}>
            <RefreshCw size={18} className="spin" /> Loading antivirus reports…
          </div>
        )}
        {!loading && scans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            No antivirus scan reports found. Make sure ClamAV is installed and the OTel agent is running on your servers.
          </div>
        )}
        {scans.map((scan, i) => <ScanCard key={i} scan={scan} index={i} />)}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
