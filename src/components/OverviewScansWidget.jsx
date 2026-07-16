import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { fetchLatestScans } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';

export default function OverviewScansWidget() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchLatestScans();
      data.sort((a, b) => {
        if (a.infectedFiles > 0 && b.infectedFiles === 0) return -1;
        if (b.infectedFiles > 0 && a.infectedFiles === 0) return 1;
        return b.timestamp - a.timestamp;
      });
      setScans(data.slice(0, 4));
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

  return (
    <div style={{
      background: 'var(--color-rgb-255-255-255-0-005)',
      border: '1px solid var(--color-rgb-255-255-255-0-03)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '380px',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-rgb-255-255-255-0-015)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '0.76rem', fontWeight: 500, color: 'var(--text-primary)' }}>Recent Scans</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="custom-scrollbar">
        {loading && scans.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.72rem', textAlign: 'center', padding: '16px' }}>Loading scans...</div>
        ) : scans.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center', padding: '16px' }}>No recent scans.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scans.map((scan, i) => {
              const infected = scan.infectedFiles > 0;
              const dateObj = new Date(scan.timestamp);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: infected ? 'var(--color-rgb-239-68-68-0-02)' : 'var(--color-rgb-255-255-255-0-005)',
                  border: `1px solid ${infected ? 'var(--color-rgb-239-68-68-0-1)' : 'var(--color-rgb-255-255-255-0-02)'}`,
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {infected ? <ShieldAlert size={14} color="var(--status-danger)" /> : <ShieldCheck size={14} color="var(--status-healthy)" />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 500, color: infected ? 'var(--status-danger)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getFriendlyName(scan.host)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {scan.scannedFiles} files scanned
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: '0.74rem', 
                      fontWeight: 600, 
                      color: infected ? 'var(--status-danger)' : 'var(--status-healthy)'
                    }}>
                      {infected ? `${scan.infectedFiles} Infected` : 'Clean'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
