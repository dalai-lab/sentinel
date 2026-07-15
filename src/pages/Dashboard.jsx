import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Terminal, Copy, Check, Info, Command, Server, ShieldAlert, Cpu, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ServerCard from '../components/ServerCard';
import SecurityFeed from '../components/SecurityFeed';
import ServerList from '../components/ServerList';
import LogConsole from '../components/LogConsole';
import SettingsPanel from '../components/SettingsPanel';
import { fetchServerMetrics, fetchActiveAlerts } from '../api/signoz';
import { getFriendlyName, getServerIp } from '../utils/serverMapping';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [servers, setServers] = useState([
    { id: 1, name: 'Oracle database server', ip: '80.225.241.81', cpu: 0, ram: 0, status: 'connecting' }
  ]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [apiError, setApiError] = useState(null);

  // Structured AI SRE Copilot data
  const [aiCopilotData, setAiCopilotData] = useState({
    status: 'Sentinel AI SRE Copilot is preparing diagnostics...',
    diagnostics: ['Ingesting live telemetry metrics...', 'Reading active alerts from SigNoz...'],
    advice: 'Standing by for first diagnostic summary.',
    command: 'sudo systemctl status otelcol'
  });

  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotExpanded, setCopilotExpanded] = useState(true);

  const parseAiData = (rawText) => {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object') {
        return {
          status: parsed.status || 'Nominal health parameters recorded.',
          diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : ['No anomalous metrics identified.'],
          advice: parsed.advice || 'Proactive server monitoring is recommended.',
          command: parsed.command || 'df -h'
        };
      }
    } catch {
      return {
        status: rawText || 'Operational.',
        diagnostics: ['AI text analysis parsed successfully.'],
        advice: 'Review active system parameters.',
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
      const alerts = await fetchActiveAlerts().catch(() => []);

      if (alerts && Array.isArray(alerts)) {
        setActiveAlerts(alerts);
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

  useEffect(() => {
    async function loadAiAdvice() {
      const currentServers = serversRef.current;
      // Skip if telemetry is not loaded yet
      if (!currentServers || currentServers.length === 0 || currentServers[0].status === 'connecting') return;

      try {
        const aiRes = await fetch('http://localhost:3001/api/metrics/ai-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ servers: currentServers })
        });
        const aiData = await aiRes.json();
        if (aiData.aiSummary) {
          setAiCopilotData(parseAiData(aiData.aiSummary));
        }
      } catch (err) {
        console.error('Failed to fetch AI summary', err);
      }
    }

    // Run AI advice fetch on mount or when telemetry first becomes online
    const timer = setTimeout(loadAiAdvice, 3000); // minor delay to allow first metrics to populate
    const interval = setInterval(loadAiAdvice, 300000); // Poll every 5 minutes (300k ms)

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

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(true)} />

        {/* Dynamic Views Router */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 700, marginBottom: '6px' }}>Infrastructure Overview</h1>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Real-time telemetry and health scores across your servers.</p>
            </div>

            {/* Quick Summary Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Stat 1 */}
              <div className="dashboard-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'var(--status-healthy-bg)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <Server size={18} color="var(--status-healthy)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Servers Online</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                    {onlineServersCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalServersCount}</span>
                  </div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="dashboard-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'var(--accent-light)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <Cpu size={18} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg CPU Load</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>{avgCpu}%</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="dashboard-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  background: activeAlertsCount > 0 ? 'var(--status-danger-bg)' : 'var(--status-healthy-bg)',
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${activeAlertsCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`
                }}>
                  <ShieldAlert size={18} color={activeAlertsCount > 0 ? 'var(--status-danger)' : 'var(--status-healthy)'} />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Threats</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: activeAlertsCount > 0 ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                    {activeAlertsCount}
                  </div>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="dashboard-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'var(--status-healthy-bg)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <CheckCircle size={18} color="var(--status-healthy)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Platform State</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '4px', color: 'var(--status-healthy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nominal
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-card" style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(15, 15, 19, 0.9) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '20px',
              padding: '18px 24px',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: copilotExpanded ? '16px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: copilotExpanded ? '1px solid rgba(99, 102, 241, 0.1)' : '1px solid transparent', paddingBottom: copilotExpanded ? '14px' : '0', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    background: 'var(--accent-light)',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={16} color="var(--accent)" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      SENTINEL AI COPILOT
                    </h4>
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' }}>
                      Active SRE Diagnostic Engine
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Terminal size={12} />
                    <span className="text-mono" style={{ color: 'var(--text-muted)' }}>copilot@sentinel-sre</span>
                  </div>

                  <button
                    onClick={() => setCopilotExpanded(!copilotExpanded)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    {copilotExpanded ? (
                      <>
                        <span>Hide Console</span>
                        <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        <span>Show Console</span>
                        <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {copilotExpanded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }} className="copilot-grid">
                  <div>
                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderLeft: '3px solid var(--accent)',
                      padding: '12px 16px',
                      borderRadius: '0 6px 6px 0',
                      marginBottom: '14px'
                    }}>
                      <span className="text-mono" style={{ color: 'var(--accent)', marginRight: '8px', fontWeight: 700 }}>[root@sentinel-ai] /#</span>
                      <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                        {aiCopilotData.status}
                      </span>
                      <span className="terminal-cursor" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px' }}>
                      {aiCopilotData.diagnostics.map((insight, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <Info size={12} style={{ marginTop: '3px', flexShrink: 0, color: 'var(--accent)' }} />
                          <span style={{ lineHeight: 1.4 }}>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '16px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }} className="copilot-action-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Command size={14} color="var(--status-warning)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Recommended Remediation Action
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {aiCopilotData.advice}
                    </p>

                    {aiCopilotData.command && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        marginTop: '6px',
                        cursor: 'pointer'
                      }}
                        onClick={() => handleCopyCommand(aiCopilotData.command)}
                        className="command-copy-box"
                        title="Click to copy command"
                      >
                        <code className="text-mono" style={{ fontSize: '0.78rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '12px' }}>
                          $ {aiCopilotData.command}
                        </code>
                        <button style={{
                          background: 'none',
                          border: 'none',
                          color: copied ? 'var(--status-healthy)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px'
                        }} aria-label="Copy code">
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              <div className="servers-container">
                {servers.map(server => (
                  <ServerCard key={server.id} {...server} />
                ))}
              </div>

              <div className="security-feed-panel">
                <SecurityFeed />
              </div>
            </div>
          </>
        )}

        {activeTab === 'servers' && <ServerList servers={servers} />}

        {activeTab === 'logs' && <LogConsole />}

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
