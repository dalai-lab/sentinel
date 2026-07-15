import React, { useState, useEffect } from 'react';
import { ShieldAlert, Flame } from 'lucide-react';
import { fetchActiveAlerts } from '../api/signoz';

export default function SecurityFeed() {
  const [realAlerts, setRealAlerts] = useState([]);

  useEffect(() => {
    // Fetch real alerts from SigNoz every 10 seconds
    const pollAlerts = async () => {
      const alerts = await fetchActiveAlerts();
      if (alerts && Array.isArray(alerts)) {
        setRealAlerts(alerts);
      }
    };
    pollAlerts();
    const interval = setInterval(pollAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldAlert size={20} color="#ff4a4a" />
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Security Center</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
        {realAlerts.length > 0 ? (
          <div>
            <h4 style={{ color: '#ff4a4a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Active Threats</h4>
            {realAlerts.map(alert => (
              <div key={alert.fingerprint} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', padding: '12px', background: 'rgba(255, 74, 74, 0.1)', border: '1px solid rgba(255, 74, 74, 0.3)', borderRadius: '8px' }}>
                <div style={{ padding: '8px', background: '#ff4a4a25', borderRadius: '8px', flexShrink: 0 }}>
                  <Flame size={16} color="#ff4a4a" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ff4a4a' }}>
                      {alert.labels?.host_name || 'Fleet'}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '12px', color: '#ff4a4a' }}>
                      FIRING
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.4, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {alert.labels?.alertname}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7 }}>
            <div style={{ padding: '16px', background: 'rgba(46, 235, 159, 0.1)', borderRadius: '50%', marginBottom: '12px' }}>
              <ShieldAlert size={32} color="#2eeb9f" />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#2eeb9f', fontWeight: 500 }}>No Active Threats</span>
            <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>All systems secure</span>
          </div>
        )}
      </div>
    </div>
  );
}
