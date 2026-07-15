import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ServerCard from '../components/ServerCard';
import { fetchServerMetrics } from '../api/signoz';

export default function Dashboard() {
  const [servers, setServers] = useState([
    { id: 1, name: 'Database-Server-Oracle', ip: '80.225.241.81', cpu: 0, ram: 0, status: 'connecting' }
  ]);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    async function loadData() {


      const result = await fetchServerMetrics();
      if (result.error) {
        setApiError(result.error);
        return;
      }

      // Parse the SigNoz response and update the server state
      if (result.success && result.cpu) {
        if (result.cpu.length === 0) {
          // If the query worked but returned nothing, it means the agent is still gathering its first metrics!
          setServers([{ id: 1, name: 'Database-Server-Oracle', ip: '80.225.241.81', cpu: 0, ram: 0, status: 'gathering data...' }]);
          setApiError(null);
        } else {
          // Create a lookup map for memory data
          const memMap = {};
          if (result.mem) {
            result.mem.forEach(m => {
              memMap[m.metric.host_name] = parseFloat(m.value[1]);
            });
          }

          const activeServers = result.cpu.map((metric, index) => {
            const hostName = metric.metric.host_name || 'Database-Server-Oracle';
            const ramVal = memMap[hostName] || 0;
            return {
              id: index + 1,
              name: hostName,
              ip: 'Live',
              cpu: parseFloat(metric.value[1]).toFixed(1),
              ram: ramVal.toFixed(1),
              status: 'online'
            };
          });
          
          setServers(activeServers);
          setApiError(null);
        }
      }
    }

    loadData();
    const interval = setInterval(loadData, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '16px 24px 16px 8px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Header />
        
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '8px' }}>Infrastructure Overview</h1>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>Real-time telemetry and health scores across your fleet.</p>
        </div>

        {apiError === 'waiting_for_token' && (
          <div style={{ padding: '16px', background: 'rgba(245, 166, 35, 0.1)', border: '1px solid var(--status-warning)', borderRadius: 'var(--radius-sm)', marginBottom: '24px', color: 'var(--status-warning)' }}>
            <strong>Action Required:</strong> Please add your SigNoz JWT Token in <code>src/api/signoz.js</code> to see live metrics from your Database Server!
          </div>
        )}

        {apiError && apiError !== 'waiting_for_token' && (
          <div style={{ padding: '16px', background: 'rgba(255, 74, 74, 0.1)', border: '1px solid var(--status-danger)', borderRadius: 'var(--radius-sm)', marginBottom: '24px', color: 'var(--status-danger)' }}>
            <strong>Connection Error:</strong> The API request failed. Open the Developer Tools (F12) Console to see the exact error message.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', alignContent: 'start' }}>
          {servers.map(server => (
            <ServerCard key={server.id} {...server} />
          ))}
        </div>
      </main>
    </div>
  );
}
