import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ServerCard from '../components/ServerCard';
import SecurityFeed from '../components/SecurityFeed';
import { fetchServerMetrics } from '../api/signoz';
import { getFriendlyName, getServerIp } from '../utils/serverMapping';

export default function Dashboard() {
  const [servers, setServers] = useState([
    { id: 1, name: 'Database-Server-Oracle', ip: '80.225.241.81', cpu: 0, ram: 0, status: 'connecting' }
  ]);
  const [apiError, setApiError] = useState(null);
  const [aiSummary, setAiSummary] = useState('Sentinel AI is analyzing your fleet telemetry...');

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
          // Create lookup maps for memory, disk, and uptime data
          const memMap = {};
          if (result.mem) {
            result.mem.forEach(m => {
              memMap[m.metric.host_name] = parseFloat(m.value[1]);
            });
          }
          
          const diskMap = {};
          if (result.disk) {
            result.disk.forEach(d => {
              diskMap[d.metric.host_name] = parseFloat(d.value[1]);
            });
          }

          const uptimeMap = {};
          if (result.uptime) {
            result.uptime.forEach(u => {
              uptimeMap[u.metric.host_name] = parseFloat(u.value[1]);
            });
          }

          const activeServers = result.cpu.map((metric, index) => {
            const hostName = metric.metric.host_name || 'Database-Server-Oracle';
            const ramVal = memMap[hostName] || 0;
            const diskVal = diskMap[hostName] || 0;
            const uptimeVal = uptimeMap[hostName] || 0;
            
            return {
              id: index + 1,
              name: getFriendlyName(hostName),
              ip: getServerIp(hostName),
              cpu: parseFloat(metric.value[1]).toFixed(1),
              ram: ramVal.toFixed(1),
              disk: diskVal.toFixed(1),
              uptime: uptimeVal, // raw seconds
              status: 'online'
            };
          });
          
          setServers(activeServers);
          setApiError(null);

          // Now fetch the AI summary asynchronously without blocking the UI rendering of the servers
          try {
            const aiRes = await fetch('http://localhost:3001/api/metrics/ai-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ servers: activeServers })
            });
            const aiData = await aiRes.json();
            if (aiData.aiSummary) {
              setAiSummary(aiData.aiSummary);
            }
          } catch (err) {
            console.error('Failed to fetch AI summary', err);
          }
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

        {/* AI Health Banner */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.1)'
        }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.2)',
            padding: '10px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={24} color="#818cf8" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, marginBottom: '4px', color: '#818cf8', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.02em' }}>
              AUTONOMOUS AI ANALYSIS
            </h4>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', lineHeight: 1.4 }}>
              {aiSummary}
            </p>
          </div>
        </div>



        {apiError && apiError !== 'waiting_for_token' && (
          <div style={{ padding: '16px', background: 'rgba(255, 74, 74, 0.1)', border: '1px solid var(--status-danger)', borderRadius: 'var(--radius-sm)', marginBottom: '24px', color: 'var(--status-danger)' }}>
            <strong>Connection Error:</strong> The API request failed. Open the Developer Tools (F12) Console to see the exact error message.
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', alignContent: 'start' }}>
            {servers.map(server => (
              <ServerCard key={server.id} {...server} />
            ))}
          </div>
          
          <div style={{ width: '350px', position: 'sticky', top: '24px', height: 'calc(100vh - 48px)' }}>
            <SecurityFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
