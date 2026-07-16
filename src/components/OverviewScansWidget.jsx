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
      // Sort infected first, then newest first, take top 4
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
    <div className="dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Recent Antivirus Scans</h3>
      </div>

      {loading && scans.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Loading scans...</div>
      ) : scans.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent scans found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scans.map((scan, i) => {
            const infected = scan.infectedFiles > 0;
            const dateObj = new Date(scan.timestamp);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: infected ? 'var(--status-danger-bg)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${infected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '6px',
                transition: 'background 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {infected ? <ShieldAlert size={16} color="#ef4444" /> : <ShieldCheck size={16} color="#10b981" />}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: infected ? '#ef4444' : 'var(--text-primary)' }}>
                      {getFriendlyName(scan.host)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {scan.scannedFiles} files scanned
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    color: infected ? '#ef4444' : '#10b981'
                  }}>
                    {infected ? `${scan.infectedFiles} Infected` : 'Clean'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {timeStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
