import React, { useState } from 'react';
import { Send, AlertTriangle, ShieldCheck, Copy, Check, Info, Command, MessageSquare, ChevronDown, ChevronUp, RefreshCw, Activity } from 'lucide-react';

export default function AiCopilotCard({ aiData, servers, alerts, recentLogs, onCommandCopy, onRefreshAiAdvice }) {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const moodColors = {
    healthy: {
      color: 'var(--status-healthy)',
      bg: 'rgba(16, 185, 129, 0.04)',
      border: 'rgba(16, 185, 129, 0.15)',
      icon: <ShieldCheck size={14} color="var(--status-healthy)" />
    },
    warning: {
      color: 'var(--status-warning)',
      bg: 'rgba(245, 158, 11, 0.04)',
      border: 'rgba(245, 158, 11, 0.15)',
      icon: <AlertTriangle size={14} color="var(--status-warning)" />
    },
    critical: {
      color: 'var(--status-danger)',
      bg: 'rgba(239, 68, 68, 0.04)',
      border: 'rgba(239, 68, 68, 0.15)',
      icon: <AlertTriangle size={14} color="var(--status-danger)" />
    }
  };

  const mood = aiData.mood || 'healthy';
  const currentMood = moodColors[mood] || moodColors.healthy;

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userQ = question;
    setQuestion('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userQ }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/metrics/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQ,
          servers,
          alerts,
          logs: recentLogs
        })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'copilot', text: data.answer || "No response received." }]);
    } catch {
      setChatHistory(prev => [...prev, { sender: 'copilot', text: "Error: Failed to communicate with the Copilot backend service." }]);
    } finally {
      setLoading(false);
    }
  };

  const copyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    if (onCommandCopy) onCommandCopy(cmd);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:3001/api/metrics/ai-summary/force', {
        method: 'POST'
      });
      if (onRefreshAiAdvice) onRefreshAiAdvice();
    } catch (e) {
      console.error('Failed to force refresh', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearIncidents = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:3001/api/metrics/incidents', {
        method: 'DELETE'
      });
      if (onRefreshAiAdvice) onRefreshAiAdvice();
    } catch (e) {
      console.error('Failed to clear incidents', e);
    } finally {
      setLoading(false);
    }
  };

  const formatChatText = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const firstLine = lines[0];
        const lang = firstLine.replace('```', '').trim();
        const code = lines.slice(1, -1).join('\n');
        return (
          <div key={idx} style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            margin: '8px 0',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.74rem',
            color: '#e5e7eb',
            whiteSpace: 'pre-wrap',
            position: 'relative',
            overflowX: 'auto'
          }}>
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '6px',
              fontSize: '0.58rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              pointerEvents: 'none'
            }}>{lang || 'code'}</div>
            <code>{code}</code>
          </div>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.005)',
      border: '1px solid rgba(255,255,255,0.03)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      height: '380px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      
      {/* Header with Mood Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.015)',
        paddingBottom: '12px',
        marginBottom: '16px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <Activity size={13} />
          </div>
          <h4 style={{ margin: 0, fontSize: '0.76rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            System Briefing
            <button 
              onClick={handleForceRefresh}
              disabled={loading}
              title="Force AI to regenerate now"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, 
                display: 'flex', alignItems: 'center', color: 'var(--text-muted)'
              }}>
              <RefreshCw size={11} className={loading ? "spin-animation" : ""} />
            </button>
          </h4>
        </div>

        {/* Mood Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 8px',
          border: `1px solid ${currentMood.border}`,
          background: currentMood.bg,
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.62rem',
          fontWeight: 600,
          color: currentMood.color,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          <span style={{ display: 'inline-flex' }}>{currentMood.icon}</span>
          {mood}
        </div>
      </div>

      {/* Scrollable Body Wrapper */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }} className="custom-scrollbar">
        {/* Main Briefing Headline */}
        <div style={{ marginBottom: '4px' }}>
          <h2 style={{
            fontSize: '0.95rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            margin: '0 0 6px 0',
            letterSpacing: '-0.01em'
          }}>
            {aiData.headline}
          </h2>
          <p style={{
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            margin: 0
          }}>
            {aiData.daily_digest}
          </p>
        </div>

        {/* Top Threat Alert (If Active) */}
        {aiData.top_threat && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.02)',
            border: '1px solid rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <AlertTriangle size={12} color="var(--status-danger)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--status-danger)', marginRight: '3px', fontWeight: 600 }}>Active Alert:</span>
                Suspicious activity logged: <span className="text-mono" style={{ background: 'rgba(255,255,255,0.03)', padding: '1px 4px', borderRadius: '3px', fontSize: '0.68rem' }}>{aiData.top_threat}</span>
              </div>
            </div>
            <button 
              onClick={handleClearIncidents}
              disabled={loading}
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--status-danger)',
                fontSize: '0.65rem',
                fontWeight: 500,
                padding: '3px 8px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Grid of Details: Insights & Recommendations */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Diagnostics & Insights */}
          <div>
            <h5 style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: '0 0 6px 0' }}>
              Observations
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {aiData.insights && aiData.insights.map((insight, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.35
                }}>
                  <Info size={11} style={{ marginTop: '2.5px', flexShrink: 0, color: 'var(--text-muted)' }} />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Advice & Remediation */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.008)',
            border: '1px solid rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
              <Command size={11} color="var(--status-warning)" />
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Suggested Action
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.35 }}>
              {aiData.tip}
            </p>

            {aiData.command && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
                onClick={() => copyCommand(aiData.command)}
              >
                <code className="text-mono" style={{ fontSize: '0.68rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '6px' }}>
                  $ {aiData.command}
                </code>
                <button style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? 'var(--status-healthy)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }} aria-label="Copy command">
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ask Copilot Interactive Section */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.015)',
          paddingTop: '10px',
          marginTop: '6px'
        }}>
          {/* Toggle Button for chat */}
          <button
            onClick={() => setChatExpanded(!chatExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '2px 0',
              fontSize: '0.72rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              outline: 'none'
            }}
          >
            <MessageSquare size={12} />
            <span>Ask Copilot</span>
            {chatExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {chatExpanded && (
            <div style={{ marginTop: '8px' }}>
              {/* Chat History */}
              {chatHistory.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginBottom: '8px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  padding: '6px',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255,255,255,0.02)'
                }}>
                  {chatHistory.map((chat, idx) => (
                    <div key={idx} style={{
                      alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                      background: chat.sender === 'user' ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      border: '1px solid rgba(255,255,255,0.02)',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      maxWidth: '90%',
                      fontSize: '0.72rem',
                      lineHeight: 1.35,
                      color: 'var(--text-secondary)'
                    }}>
                      <div style={{
                        fontSize: '0.58rem',
                        fontWeight: 650,
                        color: chat.sender === 'user' ? 'var(--text-primary)' : 'var(--text-muted)',
                        marginBottom: '2px',
                        textTransform: 'uppercase'
                      }}>
                        {chat.sender === 'user' ? 'You' : 'Copilot'}
                      </div>
                      <div>{formatChatText(chat.text)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ask Form Input */}
              <form onSubmit={handleAsk} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Ask Copilot a question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 10px',
                    fontSize: '0.74rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  style={{
                    background: 'var(--text-primary)',
                    color: 'var(--bg-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: question.trim() ? 'pointer' : 'not-allowed',
                    opacity: question.trim() ? 1 : 0.5,
                    fontSize: '0.72rem',
                    fontWeight: 500
                  }}
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
