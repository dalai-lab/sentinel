import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Clock, Database, File, Info } from 'lucide-react';
import { fetchLatestScans } from '../api/signoz';
import { getFriendlyName } from '../utils/serverMapping';

export default function AntivirusScansCard() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchLatestScans();
      // Sort so infected servers appear first, then by timestamp (newest first)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 160px)' }}>
      <div className="card ssh-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={20} color="var(--primary-color)" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Fleet Antivirus Status</h3>
          </div>
          <button onClick={loadData} disabled={loading} className="refresh-btn">
            {loading ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>

        {loading && scans.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading antivirus reports...</div>
        ) : scans.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No recent antivirus scans found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {scans.map((scan, i) => {
              const infected = scan.infectedFiles > 0;
              const dateObj = new Date(scan.timestamp);
              
              return (
                <div key={i} style={{
                  background: infected ? 'var(--status-danger-bg)' : 'var(--accent-light)',
                  border: `1px solid ${infected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.1)'}`,
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {infected ? <ShieldAlert size={24} color="#ef4444" /> : <ShieldCheck size={24} color="#10b981" />}
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: infected ? '#ef4444' : 'var(--text-primary)' }}>
                          {getFriendlyName(scan.host)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                          [{scan.host}] • Completed: {dateObj.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      background: infected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                      color: infected ? '#ef4444' : '#10b981',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}>
                      {infected ? `${scan.infectedFiles} Threats Found` : 'Clean'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <File size={16} />
                      <strong>Scanned Files:</strong> {parseInt(scan.scannedFiles).toLocaleString() || 'N/A'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <Database size={16} />
                      <strong>Data Scanned:</strong> {scan.dataScanned || 'N/A'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <Clock size={16} />
                      <strong>Duration:</strong> {scan.timeTaken || 'N/A'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <Info size={16} />
                      <strong>Engine:</strong> ClamAV {scan.engineVersion || 'N/A'}
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .refresh-btn {
          background: var(--accent);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .refresh-btn:hover:not(:disabled) {
          background: var(--primary-color);
        }
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
