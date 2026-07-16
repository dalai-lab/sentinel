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
import ServerDetailView from '../components/ServerDetailView';
import { fetchServerMetrics } from '../api/signoz';
import { fetchAlerts } from '../api/alerts';
import { getFriendlyName, getServerIp } from '../utils/serverMapping';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedServerName, setSelectedServerName] = useState(null);
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
  const [activeMobileWidget, setActiveMobileWidget] = useState('copilot');
  const [initialGraphServer, setInitialGraphServer] = useState('all');
  const [initialGraphMetric, setInitialGraphMetric] = useState(null);
  const [graphBackServer, setGraphBackServer] = useState(null);

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
      const aiRes = await fetch('/api/metrics/ai-summary/latest');
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

  // Reset scroll position to top when activeTab or selectedServerName changes
  useEffect(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector('.main-content');
    if (main) {
      main.scrollTop = 0;
    }
  }, [activeTab, selectedServerName]);

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
        onTabChange={(tab) => {
          setSelectedServerName(null);
          setActiveTab(tab);
          if (tab !== 'graphs') {
            setInitialGraphServer('all');
            setInitialGraphMetric(null);
            setGraphBackServer(null);
          }
        }}
      />

      <main className="main-content">
        <Header 
          onMenuToggle={() => setSidebarOpen(true)} 
          search={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        {/* Dynamic Views Router */}
        {selectedServerName ? (
          <ServerDetailView
            serverName={selectedServerName}
            onBack={() => setSelectedServerName(null)}
            onNavigateToGraphs={(server, metric) => {
              setInitialGraphServer(server);
              setInitialGraphMetric(metric);
              setGraphBackServer(server);
              setSelectedServerName(null);
              setActiveTab('graphs');
            }}
          />
        ) : (
          <>
            {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>Infrastructure Overview</h1>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Real-time telemetry and health scores across your servers.</p>
            </div>

            {apiError && apiError !== 'waiting_for_token' && (
              <div style={{
                padding: '12px',
                background: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                color: 'var(--status-danger)',
                fontSize: '0.8rem'
              }}>
                <strong>Connection Error:</strong> The API request failed. Open the Developer Tools (F12) Console to see the exact error message.
              </div>
            )}

            {/* Main Layout Flow */}
            {servers.length === 1 && (servers[0].status === 'connecting' || servers[0].status === 'gathering data...') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Stat Tiles Shimmer */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="shimmer-card" style={{ minHeight: '110px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div className="shimmer-bar" style={{ width: '40%', height: '10px' }} />
                      <div className="shimmer-bar" style={{ width: '60%', height: '24px' }} />
                      <div className="shimmer-bar" style={{ width: '30%', height: '8px' }} />
                    </div>
                  ))}
                </div>

                {/* Server Cards Shimmer */}
                <div className="servers-container">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="shimmer-card" style={{ minHeight: '180px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '8px', width: '60%' }}>
                          <div className="shimmer-bar" style={{ width: '32px', height: '32px' }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="shimmer-bar" style={{ width: '80%', height: '12px' }} />
                            <div className="shimmer-bar" style={{ width: '40%', height: '8px' }} />
                          </div>
                        </div>
                        <div className="shimmer-bar" style={{ width: '60px', height: '18px' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {[1, 2, 3].map(j => (
                          <div key={j} className="shimmer-card" style={{ height: '54px', padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px dashed var(--border-color)' }}>
                            <div className="shimmer-bar" style={{ width: '50%', height: '8px' }} />
                            <div className="shimmer-bar" style={{ width: '30%', height: '12px' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Grid Shimmer */}
                <div className="bottom-intelligence-grid">
                  <div className="shimmer-card" style={{ height: '380px' }} />
                  <div className="shimmer-card" style={{ height: '380px' }} />
                  <div className="shimmer-card" style={{ height: '380px' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* ── Fleet stat tiles ── */}
                  {/* Fleet Stats Strip in Premium Design Language */}
                  <div className="fleet-stats-grid">
                    {[
                      {
                        label: 'Servers Online', 
                        value: `${onlineServersCount}`, 
                        sub: `of ${totalServersCount} nodes`,
                        icon: Server, 
                        color: onlineServersCount > 0 ? 'var(--status-healthy)' : 'var(--text-muted)'
                      },
                      {
                        label: 'Fleet Avg CPU', 
                        value: `${avgCpu}%`, 
                        sub: 'across all active nodes',
                        icon: Cpu, 
                        color: 'var(--text-muted)'
                      },
                      {
                        label: 'Active Threats', 
                        value: activeAlertsCount, 
                        sub: activeAlertsCount > 0 ? 'requires attention' : 'all clear',
                        icon: ShieldAlert, 
                        color: activeAlertsCount > 0 ? 'var(--status-danger)' : 'var(--text-muted)'
                      },
                      {
                        label: 'Platform State', 
                        value: activeAlertsCount > 0 ? 'Degraded' : 'Nominal', 
                        sub: 'overall fleet state',
                        icon: CheckCircle,
                        color: activeAlertsCount > 0 ? 'var(--status-warning)' : 'var(--status-healthy)'
                      }
                    ].map(({ label, value, sub, icon: Icon, color }) => (
                      <div key={label} className="fleet-stat-tile">
                        <div className="fleet-stat-header">
                          <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
                          <Icon size={14} color={color} />
                        </div>
                        <div className="fleet-stat-value">
                          <span className="fleet-stat-value-text">
                            {value}
                          </span>
                        </div>
                        <span className="fleet-stat-sub">{sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Server Telemetry Cards Container */}
                  <div className="servers-container">
                    {filteredServers.map(server => (
                      <ServerCard key={server.id} {...server} onClick={() => setSelectedServerName(server.name)} />
                    ))}
                  </div>

                  {/* Mobile-only Segmented Control for Widgets */}
                  <div className="mobile-widget-tabs">
                    <button 
                      className={`mobile-widget-tab-btn ${activeMobileWidget === 'copilot' ? 'active' : ''}`}
                      onClick={() => setActiveMobileWidget('copilot')}
                    >
                      Copilot AI
                    </button>
                    <button 
                      className={`mobile-widget-tab-btn ${activeMobileWidget === 'alerts' ? 'active' : ''}`}
                      onClick={() => setActiveMobileWidget('alerts')}
                    >
                      Alerts
                    </button>
                    <button 
                      className={`mobile-widget-tab-btn ${activeMobileWidget === 'scans' ? 'active' : ''}`}
                      onClick={() => setActiveMobileWidget('scans')}
                    >
                      Scans
                    </button>
                  </div>

                  {/* Bottom Intelligence Grid */}
                  <div className="bottom-intelligence-grid mobile-tabbed">
                    <div className={activeMobileWidget === 'copilot' ? 'active-tab-widget' : ''}>
                      <AiCopilotCard
                        aiData={aiCopilotData}
                        servers={servers}
                        alerts={activeAlerts}
                        recentLogs={recentLogs}
                        onCommandCopy={handleCopyCommand}
                        onRefreshAiAdvice={loadAiAdvice}
                      />
                    </div>
                    <div className={activeMobileWidget === 'alerts' ? 'active-tab-widget' : ''}>
                      <AlertCenterWidget />
                    </div>
                    <div className={activeMobileWidget === 'scans' ? 'active-tab-widget' : ''}>
                      <OverviewScansWidget />
                    </div>
                  </div>
              </div>
            )}
            </>
          )}

            {activeTab === 'graphs' && (
              <GraphsView 
                initialServer={initialGraphServer} 
                initialMetric={initialGraphMetric} 
                onBack={graphBackServer ? () => {
                  setSelectedServerName(graphBackServer);
                  setGraphBackServer(null);
                } : null}
              />
            )}
            {activeTab === 'threatmap' && <ThreatMapView />}

            {activeTab === 'servers' && <ServerList servers={filteredServers} onSelectServer={setSelectedServerName} />}

            {activeTab === 'logs' && <LogConsole />}

            {activeTab === 'ssh' && <SshLoginsCard topThreat={aiCopilotData.top_threat} />}
            
            {activeTab === 'scans' && <AntivirusScansCard />}

            {activeTab === 'settings' && <SettingsPanel />}
          </>
        )}
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
