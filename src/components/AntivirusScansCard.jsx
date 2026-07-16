import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Clock, Database, File, RefreshCw, AlertTriangle, Server, ChevronDown, ChevronUp, ExternalLink, Loader, Tag } from 'lucide-react';
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
  const datePrefix = isToday ? 'Today' : isYesterday ? 'Yesterday' :
    dateObj.toLocaleDateString([], { day: 'numeric', month: 'short' });
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

const SEV_STYLES = {
  critical: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  text: '#ef4444' },
  high:     { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', text: '#f97316' },
  medium:   { bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.25)',  text: '#eab308' },
  low:      { bg: 'rgba(132,204,22,0.08)', border: 'rgba(132,204,22,0.25)', text: '#84cc16' },
  info:     { bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)', text: '#60a5fa' },
};

async function fetchThreatIntel(sig) {
  const res = await fetch(`/api/threat/lookup?sig=${encodeURIComponent(sig)}`);
  if (!res.ok) throw new Error('lookup failed');
  return res.json();
}

// ─── VirusTotal threat intel panel (lazy-loaded on expand) ─────────────────
function ThreatIntelPanel({ threatName }) {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (intel || loading) return;
    setLoading(true);
    try {
      const data = await fetchThreatIntel(threatName);
      setIntel(data);
    } catch {
      setError('Could not fetch threat data');
    } finally {
      setLoading(false);
    }
  }, [threatName, intel, loading]);

  const handleToggle = () => {
    if (!expanded) load();
    setExpanded(e => !e);
  };

  const sev = intel ? (SEV_STYLES[intel.severity] || SEV_STYLES.medium) : null;
  const detCount = (intel?.detectionCount != null && intel?.totalEngines != null)
    ? `${intel.detectionCount} / ${intel.totalEngines}`
    : null;
  const detRate = intel?.detectionRate != null ? `${intel.detectionRate}%` : null;

  return (
    <div style={{
      background: 'rgba(9, 9, 11, 0.6)',
      border: '1px solid rgba(239, 68, 68, 0.15)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }}>
      {/* Clickable row */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          padding: '10px 12px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer', gap: '8px',
          outline: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <ShieldAlert size={13} color="var(--status-danger)" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{
              fontFamily: 'var(--font-mono, monospace)', fontSize: '0.68rem', fontWeight: 600,
              color: '#ef4444', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
            }}>
              {threatName}
            </div>
            {intel && (
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {intel.platform} · {intel.category}
                {intel.family && intel.family !== threatName ? ` · ${intel.family}` : ''}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {intel && (
            <span style={{
              fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', padding: '2px 6px', borderRadius: '3px',
              background: sev.bg, border: `1px solid ${sev.border}`, color: sev.text
            }}>
              {intel.severity}
            </span>
          )}
          {detRate && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '2px 6px', borderRadius: '3px'
            }}>
              {detRate} detected
            </span>
          )}
          {loading && <Loader size={11} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />}
          {expanded ? <ChevronUp size={11} color="var(--text-muted)" /> : <ChevronDown size={11} color="var(--text-muted)" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{
          padding: '0 12px 12px 12px',
          borderTop: '1px solid rgba(239,68,68,0.08)',
          display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '8px 0' }}>
              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Querying signature details…
            </div>
          )}
          {error && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '4px 0' }}>{error}</div>}

          {intel && !loading && (
            <>
              {/* 2×2 info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '8px' }}>
                {[
                  { label: 'Platform target', value: intel.platform },
                  { label: 'Threat category', value: intel.category },
                  { label: 'Severity rating', value: intel.severity.toUpperCase(), color: sev?.text },
                  { label: 'Engine matches', value: detCount || (intel.sourceMode === 'offline' ? 'Signature Database' : 'N/A') },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.02)',
                    borderRadius: '4px', padding: '6px 8px'
                  }}>
                    <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: color || 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {intel.tags && intel.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                  <Tag size={10} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  {intel.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.56rem', fontWeight: 500,
                      padding: '1px 6px', borderRadius: '3px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      color: 'var(--text-secondary)'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Source + VT link */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                  {intel.sourceMode === 'live' ? 'Live VirusTotal lookup matching' : 'Local signature database lookup'}
                </span>
                <a
                  href={intel.vtLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.62rem', fontWeight: 600, color: '#60a5fa',
                    textDecoration: 'none', transition: 'color 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#93c5fd'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#60a5fa'; }}
                >
                  Verify on VirusTotal <ExternalLink size={10} />
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single infected file row with Threat Intel button ─────────────────────
function InfectedFileRow({ item }) {
  const [showThreat, setShowThreat] = useState(false);
  const path = item?.path ?? item; // backwards compat plain strings

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)', fontSize: '0.64rem', color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.02)', padding: '6px 10px',
        borderLeft: '2px solid var(--status-danger)',
        borderRadius: '2px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '12px'
      }}>
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={path}>
          {path}
        </span>
        {item?.threatName && (
          <button
            type="button"
            onClick={() => setShowThreat(s => !s)}
            style={{
              background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)',
              color: '#ef4444', fontSize: '0.55rem', fontWeight: 700,
              padding: '2px 8px', borderRadius: '3px', cursor: 'pointer',
              flexShrink: 0, letterSpacing: '0.04em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
          >
            {showThreat ? 'Hide Intel' : 'Threat Intel'}
          </button>
        )}
      </div>
      {showThreat && item?.threatName && (
        <div style={{ paddingLeft: '8px' }}>
          <ThreatIntelPanel threatName={item.threatName} />
        </div>
      )}
    </div>
  );
}

// ─── Per-server scan card ───────────────────────────────────────────────────
function ScanCard({ scan }) {
  const infected = scan.infectedFiles > 0;
  const scannedNum = parseInt(scan.scannedFiles) || 0;
  const name = getFriendlyName(scan.host);
  const [showInfectedList, setShowInfectedList] = useState(true);

  const statusColor = infected ? 'var(--status-danger)' : 'var(--status-healthy)';
  const borderColor = infected ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-color)';
  const StatusIcon = infected ? ShieldAlert : ShieldCheck;
  const statusLabel = infected ? 'Infected' : 'Clean';

  return (
    <div
      style={{
        background: 'var(--color-rgb-255-255-255-0-005)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'var(--transition)'
      }}
      className="dashboard-card"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: infected ? 'rgba(239, 68, 68, 0.03)' : 'rgba(16, 185, 129, 0.03)',
            border: `1px solid ${infected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
            borderRadius: 'var(--radius-sm)', padding: '8px', display: 'flex',
            boxShadow: infected ? '0 0 12px rgba(239, 68, 68, 0.05)' : 'none'
          }}>
            <StatusIcon size={14} color={statusColor} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{scan.host}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={infected ? "pulse-dot" : ""} style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor
            }} />
            <span style={{
              color: statusColor, fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase'
            }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} /> {formatFriendlyDateTime(scan.timestamp)}
          </div>
        </div>
      </div>

      {/* Metrics grid 2×3 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1px',
        background: 'var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)'
      }}>
        {[
          { label: 'Files Scanned', value: scannedNum.toLocaleString(), icon: File, color: 'var(--text-secondary)' },
          { label: 'Directories', value: scan.scannedDirectories || 'N/A', icon: Database, color: 'var(--color-hex-60a5fa)' },
          { label: 'Duration', value: formatDuration(scan.timeTaken), icon: Clock, color: 'var(--color-hex-a78bfa)' },
          { label: 'Data Scanned', value: scan.dataScanned || 'N/A', icon: Database, color: 'var(--text-secondary)' },
          { label: 'Data Read', value: scan.dataRead || 'N/A', icon: Database, color: 'var(--text-secondary)' },
          { label: 'Engine', value: scan.engineVersion ? `ClamAV v${scan.engineVersion}` : 'ClamAV', icon: Shield, color: 'var(--text-muted)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: 'var(--bg-secondary)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Icon size={11} color={color} style={{ opacity: 0.8 }} />
              <span style={{ fontSize: '0.56rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={value}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Scan window + Virus DB strip */}
      {(scan.startDate || scan.knownViruses) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--color-rgb-255-255-255-0-02)', paddingTop: '10px' }}>
          {scan.knownViruses && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: '4px' }}>
              <span>Virus DB:</span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 500 }}>{parseInt(scan.knownViruses).toLocaleString()} signatures</span>
            </div>
          )}
          {scan.startDate && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: '4px' }}>
              <span>Scan window:</span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 500 }}>{scan.startDate} → {scan.endDate || '—'}</span>
            </div>
          )}
        </div>
      )}

      {/* Infected files — collapsible with per-threat VT intel */}
      {infected && scan.infectedFilesList && scan.infectedFilesList.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.01)',
          border: '1px solid rgba(239,68,68,0.12)',
          borderRadius: 'var(--radius-sm)', overflow: 'hidden'
        }}>
          <button
            type="button"
            onClick={() => setShowInfectedList(!showInfectedList)}
            style={{
              width: '100%', background: 'rgba(239, 68, 68, 0.02)', border: 'none',
              borderBottom: showInfectedList ? '1px solid rgba(239, 68, 68, 0.08)' : 'none',
              padding: '10px 12px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
              color: 'var(--status-danger)', fontSize: '0.65rem',
              fontWeight: 600, textTransform: 'uppercase', transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={11} />
              <span>{scan.infectedFiles} Infection{scan.infectedFiles !== 1 ? 's' : ''} Identified</span>
            </div>
            {showInfectedList ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {showInfectedList && (
            <div style={{
              padding: '12px',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              {scan.infectedFilesList.slice(0, 10).map((item, idx) => (
                <InfectedFileRow key={idx} item={item} />
              ))}
              {scan.infectedFilesList.length > 10 && (
                <div style={{ fontSize: '0.60rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                  + {scan.infectedFilesList.length - 10} more infected items
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AntivirusScansCard({ globalSearch = '' }) {
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

  const filteredScans = scans.filter(s => {
    if (!globalSearch) return true;
    const term = globalSearch.toLowerCase();
    const name = getFriendlyName(s.host).toLowerCase();
    return name.includes(term) || s.host.toLowerCase().includes(term);
  });

  const cleanCount    = filteredScans.filter(s => s.infectedFiles === 0).length;
  const infectedCount = filteredScans.filter(s => s.infectedFiles > 0).length;
  const totalFiles    = filteredScans.reduce((acc, s) => acc + (parseInt(s.scannedFiles) || 0), 0);
  const totalThreats  = filteredScans.reduce((acc, s) => acc + (s.infectedFiles || 0), 0);
  const lastScanAge   = filteredScans.length > 0 ? formatRelativeAge(Math.max(...filteredScans.map(s => s.timestamp))) : 'N/A';
  const isFleetSecure = totalThreats === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', paddingBottom: '20px', animation: 'fadeIn 0.4s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Security</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Antivirus</span>
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--text-muted)" /> Antivirus Scans
          </h2>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            background: 'var(--color-rgb-255-255-255-0-01)',
            border: '1px solid var(--color-rgb-255-255-255-0-02)',
            color: 'var(--text-primary)', padding: '5px 12px',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontWeight: 500, opacity: loading ? 0.6 : 1,
            fontSize: '0.72rem', transition: 'var(--transition)'
          }}
          className="command-copy-box"
        >
          <RefreshCw size={11} className={loading ? 'spin' : ''} />
          <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Hero grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 1fr) 2.5fr',
        gap: '16px', alignItems: 'stretch'
      }} className="antivirus-hero-container">

        {/* Shield posture panel */}
        <div style={{
          background: 'var(--color-rgb-255-255-255-0-005)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '24px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center'
        }} className="dashboard-card">
          <div style={{
            width: '64px', height: '64px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-rgb-255-255-255-0-01)', marginBottom: '16px'
          }}>
            {isFleetSecure
              ? <ShieldCheck size={32} color="var(--status-healthy)" />
              : <ShieldAlert size={32} color="var(--status-danger)" />
            }
          </div>
          <span style={{
            fontSize: '0.58rem', fontWeight: 650, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isFleetSecure ? 'var(--status-healthy)' : 'var(--status-danger)',
            marginBottom: '4px'
          }}>
            {isFleetSecure ? 'Status: Secure' : 'Status: Compromised'}
          </span>
          <h3 style={{ fontSize: '0.90rem', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            {isFleetSecure ? 'No threats detected' : 'Infection detected'}
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4', maxWidth: '200px' }}>
            {isFleetSecure
              ? 'All active filesystem integrity checks report healthy.'
              : 'Malicious directory signatures identified on the system.'}
          </p>
        </div>

        {/* Fleet stats grid */}
        <div className="fleet-stats-grid" style={{ height: '100%', marginBottom: 0 }}>
          {[
            { icon: Server,      label: 'Audited Nodes',  value: filteredScans.length,                  color: 'var(--text-muted)',        sub: 'active client connections' },
            { icon: ShieldCheck, label: 'Healthy Nodes',  value: cleanCount,                    color: 'var(--status-healthy)',    sub: 'reporting healthy audits' },
            { icon: ShieldAlert, label: 'Infected Nodes', value: infectedCount,                 color: infectedCount > 0 ? 'var(--status-danger)' : 'var(--text-muted)', sub: infectedCount > 0 ? `${totalThreats} total infections` : 'secure state' },
            { icon: File,        label: 'Files Scanned',  value: totalFiles.toLocaleString(),   color: 'var(--color-hex-60a5fa)', sub: `last check: ${lastScanAge}` },
          ].map(({ icon: Icon, label, value, color, sub }) => (
            <div key={label} className="fleet-stat-tile" style={{ justifyContent: 'center' }}>
              <div className="fleet-stat-header">
                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
                <Icon size={12} color={color} />
              </div>
              <div className="fleet-stat-value" style={{ margin: '4px 0' }}>
                <span className="fleet-stat-value-text" style={{ fontSize: '1.5rem' }}>{value}</span>
              </div>
              <span className="fleet-stat-sub" style={{ fontSize: '0.65rem' }}>{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Server scan report cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        <h4 style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
          Server Scan Reports
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          {loading && filteredScans.length === 0 && ([1, 2, 3, 4].map(i => (
            <div key={i} className="shimmer-card" style={{ height: '140px' }} />
          )))}
          {!loading && filteredScans.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', textAlign: 'center', padding: '40px',
              color: 'var(--text-muted)', fontSize: '0.74rem',
              border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)'
            }}>
              No active antivirus scan records detected.
            </div>
          )}
          {filteredScans.map((scan, i) => <ScanCard key={i} scan={scan} />)}
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .antivirus-hero-container { grid-template-columns: 1fr !important; }
        }
        .pulse-dot {
          animation: pulse-dot-anim 2s infinite;
        }
        @keyframes pulse-dot-anim {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
