import React, { useState, useEffect, useRef } from 'react';
import { Server, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ServerCard from '../components/ServerCard';

import SshLoginsCard from '../components/SshLoginsCard';
import ServerList from '../components/ServerList';
import LogConsole from '../components/LogConsole';
import SettingsPanel from '../components/SettingsPanel';
import AiCopilotCard from '../components/AiCopilotCard';
import AntivirusScansCard from '../components/AntivirusScansCard';
import OverviewScansWidget from '../components/OverviewScansWidget';
import AlertCenterWidget from '../components/AlertCenterWidget';
import GraphsView from '../components/GraphsView';
import ThreatMapView from '../components/ThreatMapView';
import TopologyView from '../components/TopologyView';
import { fetchServerMetrics } from '../api/signoz';
import { fetchAlerts } from '../api/alerts';
import { getFriendlyName, getServerIp } from '../utils/serverMapping';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [servers, setServers] = useState([
    { id: 1, name: 'Oracle database server', ip: '80.225.241.81', cpu: 0, ram: 0, status: 'connecting' }
  ]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  // Structured AI SRE Copilot data
  const [aiCopilotData, setAiCopilotData] = useState({
    headline: 'Sentinel AI SRE Copilot is preparing diagnostics...',
    mood: 'healthy',
    insights: ['Ingesting live telemetry metrics...', 'Reading active alerts from SigNoz...'],
    daily_digest: 'Standing by for first diagnostic summary.',
    top_threat: null,
    tip: 'Reviewing active server configuration...',
    command: 'sudo systemctl status otelcol'
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const parseAiData = (rawText) => {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object') {
        return {
          headline: parsed.headline || parsed.status || 'Nominal health parameters recorded.',
          mood: parsed.mood || 'healthy',
          insights: Array.isArray(parsed.insights) ? parsed.insights : (Array.isArray(parsed.diagnostics) ? parsed.diagnostics : ['No anomalous metrics identified.']),
          daily_digest: parsed.daily_digest || parsed.advice || 'Proactive server monitoring is recommended.',
          top_threat: parsed.top_threat || null,
          tip: parsed.tip || parsed.advice || 'Verify regular backups and security controls.',
          command: parsed.command || 'df -h'
        };
      }
    } catch {
      return {
        headline: rawText || 'Operational.',
        mood: 'healthy',
        insights: ['AI text analysis parsed successfully.'],
        daily_digest: 'Review active system parameters.',
        top_threat: null,
        tip: 'Check dashboard logs for connection states.',
        command: 'docker ps --all'
      };
    }
  };

  const handleCopyCommand = (cmd) => {
    if (!cmd) return;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    async function loadData() {
      const result = await fetchServerMetrics();
      const alerts = await fetchAlerts().catch(() => []);

      if (alerts && Array.isArray(alerts)) {
        setActiveAlerts(alerts.filter(a => a.status === 'active'));
      }

      if (result.error) {
        setApiError(result.error);
        return;
      }

      // Parse the SigNoz response and update the server state
      if (result.success && result.cpu) {
        if (result.cpu.length === 0) {
          setServers([{ id: 1, name: 'Oracle database server', ip: '80.225.241.81', cpu: 0, ram: 0, status: 'gathering data...' }]);
          setApiError(null);
        } else {
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

          const loadMap = {};
          if (result.load) {
            result.load.forEach(l => {
              loadMap[l.metric.host_name] = parseFloat(l.value[1]);
            });
          }

          const netRecvMap = {};
          if (result.netRecv) {
            result.netRecv.forEach(n => {
              netRecvMap[n.metric.host_name] = parseFloat(n.value[1]);
            });
          }

          const netSentMap = {};
          if (result.netSent) {
            result.netSent.forEach(n => {
              netSentMap[n.metric.host_name] = parseFloat(n.value[1]);
            });
          }

          const activeServers = result.cpu.map((metric, index) => {
            const hostName = metric.metric.host_name || 'Database-Server-Oracle';
            const ramVal = memMap[hostName] || 0;
            const diskVal = diskMap[hostName] || 0;
            const uptimeVal = uptimeMap[hostName] || 0;
            const loadVal = loadMap[hostName] || 0;
            const netRecvVal = netRecvMap[hostName] || 0;
            const netSentVal = netSentMap[hostName] || 0;

            return {
              id: index + 1,
              name: getFriendlyName(hostName),
              ip: getServerIp(hostName),
              cpu: parseFloat(metric.value[1]).toFixed(1),
              ram: ramVal.toFixed(1),
              disk: diskVal.toFixed(1),
              uptime: uptimeVal, // raw seconds
              load: loadVal.toFixed(2),
              netRecv: netRecvVal, // raw bytes/sec
              netSent: netSentVal, // raw bytes/sec
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

  // Separate Effect to fetch SRE AI advice every 5 minutes
  const serversRef = useRef(servers);
  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  async function loadAiAdvice() {
    try {
      const aiRes = await fetch('http://localhost:3001/api/metrics/ai-summary/latest');
      if (aiRes.status === 503) {
        // AI is still generating, skip update
        return;
      }
      const aiData = await aiRes.json();
      if (aiData.aiSummary) {
        setAiCopilotData(parseAiData(aiData.aiSummary));
      }
    } catch (err) {
      console.error('Failed to fetch latest AI summary', err);
    }
  }

  useEffect(() => {
    // Poll the fast, cached backend endpoint every 15 seconds (costs 0 tokens)
    const timer = setTimeout(loadAiAdvice, 3000); // minor delay to allow backend to boot
    const interval = setInterval(loadAiAdvice, 15000); 

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Summary Metrics Helper
  const totalServersCount = 4; // Total catalog servers
  const onlineServersCount = servers.filter(s => s.status === 'online').length;
  const avgCpu = Math.round(servers.reduce((acc, curr) => acc + (parseFloat(curr.cpu) || 0), 0) / servers.length);
  const activeAlertsCount = activeAlerts.length;

  const filteredServers = servers.filter(s => {
    if (!globalSearch) return true;
    const term = globalSearch.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.ip.includes(term);
  });

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="main-content">
        <Header 
          onMenuToggle={() => setSidebarOpen(true)} 
          search={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        {/* Dynamic Views Router */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 700, marginBottom: '6px' }}>Infrastructure Overview</h1>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Real-time telemetry and health scores across your servers.</p>
            </div>

            {apiError && apiError !== 'waiting_for_token' && (
              <div style={{
                padding: '16px',
                background: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '24px',
                color: 'var(--status-danger)',
                fontSize: '0.9rem'
              }}>
                <strong>Connection Error:</strong> The API request failed. Open the Developer Tools (F12) Console to see the exact error message.
              </div>
            )}

            {/* Core Layout Grid */}
            <div className="dashboard-grid">
              
              {/* Left Column: Stats Summary & Telemetry Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* ── AAA Grade stat tiles ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  {[
                    {
                      label: 'Servers Online', 
                      value: `${onlineServersCount}`, 
                      sub: `of ${totalServersCount} nodes`,
                      icon: Server, color: '#10b981',
                      bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',
                    },
                    {
                      label: 'Fleet Avg CPU', 
                      value: `${avgCpu}%`, 
                      sub: 'across all servers',
                      icon: Cpu, color: '#818cf8',
                      bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)',
                    },
                    {
                      label: 'Active Threats', 
                      value: activeAlertsCount, 
                      sub: activeAlertsCount > 0 ? 'requires attention' : 'all clear',
                      icon: ShieldAlert, 
                      color: activeAlertsCount > 0 ? '#ef4444' : '#10b981',
                      bg: activeAlertsCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
                      border: activeAlertsCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.2)',
                    },
                    {
                      label: 'Platform State', 
                      value: activeAlertsCount > 0 ? 'DEGRADED' : 'NOMINAL', 
                      sub: 'overall health',
                      icon: CheckCircle,
                      color: activeAlertsCount > 0 ? '#f59e0b' : '#10b981',
                      bg: activeAlertsCount > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.06)',
                      border: activeAlertsCount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                    },
                  ].map(({ label, value, sub, icon: Icon, color, bg, border }) => (
                    <div key={label} style={{
                      background: 'linear-gradient(145deg, #0d0f16, #11141f)',
                      border: `1px solid ${border}`,
                      borderTop: `3px solid ${color}`,
                      borderRadius: '14px',
                      padding: '18px 20px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${bg} 0%, transparent 70%)`, pointerEvents: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ background: `${color}18`, border: `1px solid ${color}30`, borderRadius: '7px', padding: '6px' }}>
                          <Icon size={14} color={color} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1, marginBottom: '4px', letterSpacing: '-0.02em' }}>{value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Server Telemetry Cards Container */}
                <div className="servers-container">
                  {filteredServers.map(server => (
                    <ServerCard key={server.id} {...server} />
                  ))}
                </div>
              </div>

              {/* Right Column: AI SRE Briefing & Active Alerts Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <AiCopilotCard
                  aiData={aiCopilotData}
                  servers={servers}
                  alerts={activeAlerts}
                  recentLogs={recentLogs}
                  onCommandCopy={handleCopyCommand}
                  onRefreshAiAdvice={loadAiAdvice}
                />
                <div className="security-feed-panel" style={{ width: '100%', flex: 1 }}>
                  <OverviewScansWidget />
                </div>
                <div className="security-feed-panel" style={{ width: '100%' }}>
                  <AlertCenterWidget />
                </div>
              </div>

            </div>
          </>
        )}

        {activeTab === 'graphs' && <GraphsView />}
        {activeTab === 'threatmap' && <ThreatMapView />}
        {activeTab === 'topology' && <TopologyView />}

        {activeTab === 'servers' && <ServerList servers={filteredServers} />}

        {activeTab === 'logs' && <LogConsole />}

        {activeTab === 'ssh' && <SshLoginsCard topThreat={aiCopilotData.top_threat} />}
        
        {activeTab === 'scans' && <AntivirusScansCard />}

        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      <style>{`
        .terminal-cursor {
          display: inline-block;
          width: 8px;
          height: 14px;
          background: var(--text-primary);
          margin-left: 4px;
          animation: blink 1s step-end infinite;
          vertical-align: middle;
        }
        @keyframes blink {
          from, to { background-color: transparent }
          50% { background-color: var(--text-primary) }
        }

        .command-copy-box {
          transition: var(--transition);
        }
        .command-copy-box:hover {
          background: rgba(99, 102, 241, 0.08) !important;
          border-color: rgba(99, 102, 241, 0.3) !important;
        }

        @media (min-width: 1024px) {
          .copilot-grid {
            grid-template-columns: 1fr 340px !important;
          }
        }
      `}</style>
    </div>
  );
}
