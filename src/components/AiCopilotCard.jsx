import React, { useState } from 'react';
import { Sparkles, Send, AlertTriangle, ShieldCheck, Copy, Check, Info, Command, MessageSquare, ChevronDown, ChevronUp, RefreshCw, Activity } from 'lucide-react';

export default function AiCopilotCard({ aiData, servers, alerts, recentLogs, onCommandCopy, onRefreshAiAdvice }) {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const moodColors = {
    healthy: {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.2)',
      glow: 'rgba(16, 185, 129, 0.3)',
      icon: <ShieldCheck size={16} color="#10b981" />
    },
    warning: {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.2)',
      glow: 'rgba(245, 158, 11, 0.3)',
      icon: <AlertTriangle size={16} color="#f59e0b" />
    },
    critical: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.2)',
      glow: 'rgba(239, 68, 68, 0.3)',
      icon: <AlertTriangle size={16} color="#ef4444" />
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
      // Hit the force backend endpoint
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

  // Helper to format chat message text containing markdown code blocks
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
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
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
    <div className="dashboard-card" style={{
      background: 'rgba(255, 255, 255, 0.015)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      marginBottom: '16px'
    }}>
      
      {/* Header with Mood Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        paddingBottom: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--accent-light)',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={14} color="var(--accent)" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI COPILOT BRIEFING
              <button 
                onClick={handleForceRefresh}
                disabled={loading}
                title="Force AI to regenerate now"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, 
                  display: 'flex', alignItems: 'center', color: 'var(--text-muted)'
                }}>
                <RefreshCw size={12} className={loading ? "spin-animation" : ""} />
              </button>
            </h4>
          </div>
        </div>

        {/* Mood Orb Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: currentMood.bg,
          border: `1px solid ${currentMood.border}`,
          borderRadius: '12px',
          fontSize: '0.68rem',
          fontWeight: 750,
          color: currentMood.color,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          <div className="mood-orb" style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: currentMood.color,
            boxShadow: `0 0 8px ${currentMood.glow}`
          }} />
          {mood}
        </div>
      </div>

      {/* Main Briefing Headline */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{
          fontSize: '1.15rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          margin: '0 0 6px 0',
          letterSpacing: '-0.01em'
        }}>
          {aiData.headline}
        </h2>
        <p style={{
          fontSize: '0.8rem',
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
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              <span style={{ color: '#ef4444', marginRight: '4px', fontWeight: 800 }}>AI Alert:</span>
              Suspicious activity logged from IP/Host: <span className="text-mono" style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '4px', fontSize: '0.72rem' }}>{aiData.top_threat}</span>
            </div>
          </div>
          <button 
            onClick={handleClearIncidents}
            disabled={loading}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
              color: '#ef4444',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '4px 10px',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            className="clear-threat-btn"
          >
            Clear Threats
          </button>
        </div>
      )}

      {/* Grid of Details: Insights & Recommendations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginBottom: '14px'
      }}>
        {/* Diagnostics & Insights */}
        <div>
          <h5 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.03em', margin: '0 0 6px 0' }}>
            System Observations
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {aiData.insights && aiData.insights.map((insight, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.35
              }}>
                <Info size={11} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--accent)' }} />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Advice & Remediation */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <Command size={12} color="var(--status-warning)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Suggested Action
            </span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.35 }}>
            {aiData.tip}
          </p>

          {aiData.command && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid rgba(99, 102, 241, 0.12)',
              borderRadius: '4px',
              padding: '6px 10px',
              cursor: 'pointer'
            }}
              onClick={() => copyCommand(aiData.command)}
              className="command-copy-box"
            >
              <code className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '8px' }}>
                $ {aiData.command}
              </code>
              <button style={{
                background: 'none',
                border: 'none',
                color: copied ? 'var(--status-healthy)' : 'var(--text-secondary)',
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
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        paddingTop: '10px',
        marginTop: '6px'
      }}>
        {/* Toggle Button for chat to keep it compact */}
        <button
          onClick={() => setChatExpanded(!chatExpanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            padding: '2px 0',
            fontSize: '0.76rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            outline: 'none'
          }}
        >
          <MessageSquare size={13} />
          <span>ASK COPILOT QUESTION</span>
          {chatExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {chatExpanded && (
          <div style={{ marginTop: '10px' }}>
            {/* Chat History */}
            {chatHistory.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '10px',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '8px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}>
                {chatHistory.map((chat, idx) => (
                  <div key={idx} style={{
                    alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: chat.sender === 'user' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: chat.sender === 'user' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    maxWidth: '90%',
                    fontSize: '0.76rem',
                    lineHeight: 1.4,
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      color: chat.sender === 'user' ? 'var(--accent)' : 'var(--text-muted)',
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
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '0.76rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: question.trim() ? 'pointer' : 'not-allowed',
                  opacity: question.trim() ? 1 : 0.5,
                  transition: 'opacity 0.15s'
                }}
              >
                {loading ? (
                  <Sparkles size={12} className="spin-animation" color="#fff" />
                ) : (
                  <Send size={12} color="#fff" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
     {/* Style Tag Removed */}
    </div>
  );
}
