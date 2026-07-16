import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Check, AlertCircle, RefreshCw, ToggleLeft, ToggleRight, Shield, MessageCircle, Clock, UserPlus, Bell } from 'lucide-react';

export default function TelegramSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [newChatId, setNewChatId] = useState('');
  
  const [testing, setTesting] = useState(false);
  const [sendingActive, setSendingActive] = useState(false);
  const [pendingChats, setPendingChats] = useState([]);
  const [activeTab, setActiveTab] = useState('configured');
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSettings();
    loadActiveAlertCount();
  }, []);

  const loadActiveAlertCount = async () => {
    try {
      const res = await fetch('/api/alerts');
      const json = await res.json();
      const alerts = Array.isArray(json) ? json : (json.data || []);
      setActiveAlertCount(alerts.filter(a => a.status === 'active').length);
    } catch (e) {
      // silently ignore
    }
  };

  useEffect(() => {
    if (!settings?.botTokenConfigured) return;
    
    const pollPending = async () => {
      try {
        const res = await fetch('/api/telegram/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const json = await res.json();
        if (json.success) {
          setPendingChats(json.pending || []);
        }
      } catch (err) {
        // Silently fail polling
      }
    };
    
    pollPending();
    const interval = setInterval(pollPending, 5000);
    return () => clearInterval(interval);
  }, [settings?.botTokenConfigured, settings?.recipients]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/settings');
      const json = await res.json();
      if (json.status === 'success') {
        setSettings(json.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load Telegram settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (updates) => {
    try {
      const res = await fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setSettings(json.data);
        setSuccessMsg('Settings saved successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg('Failed to save settings.');
    }
  };

  const handleToggleMasterEnable = () => {
    const active = !settings.active;
    handleSaveSettings({ active });
  };

  const handleApprovePending = async (chat) => {
    await handleAddRecipientRaw(chat.username, chat.chatId);
    setPendingChats(prev => prev.filter(c => c.chatId !== chat.chatId));
    setSuccessMsg(`Approved ${chat.username}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddRecipientRaw = async (name, chatId) => {
    try {
      const res = await fetch('/api/telegram/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, chatId })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setSettings(prev => ({ ...prev, recipients: json.data }));
      }
    } catch (err) {
      setErrorMsg('Failed to add recipient');
    }
  };

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    if (!newChatId) {
      setErrorMsg('Please enter a valid Chat ID.');
      return;
    }
    setErrorMsg('');
    await handleAddRecipientRaw(newName, newChatId);
    setNewName('');
    setNewChatId('');
    setSuccessMsg('Chat ID added successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRemove = async (id) => {
    try {
      const res = await fetch(`/api/telegram/recipients/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        setSettings(prev => ({ ...prev, recipients: json.data }));
      }
    } catch (err) {
      setErrorMsg('Failed to remove recipient');
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`/api/telegram/recipients/${id}/toggle`, { method: 'PUT' });
      const json = await res.json();
      if (json.status === 'success') {
        setSettings(prev => ({ ...prev, recipients: json.data }));
      }
    } catch (err) {
      setErrorMsg('Failed to toggle recipient');
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message);
      } else {
        setErrorMsg(json.message);
      }
    } catch (err) {
      setErrorMsg('Failed to dispatch test message. ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSendActiveAlerts = async () => {
    setSendingActive(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/telegram/send-active-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        const { sent, total } = json;
        if (total === 0) {
          setSuccessMsg('No active alerts — system is currently clean.');
        } else {
          setSuccessMsg(`Dispatched ${sent} of ${total} active alert${total !== 1 ? 's' : ''} to all recipients.`);
        }
      } else {
        setErrorMsg(json.message);
      }
    } catch (err) {
      setErrorMsg('Failed to dispatch active alerts. ' + err.message);
    } finally {
      setSendingActive(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="dashboard-card" style={{ padding: '24px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
        <RefreshCw size={12} className="spin" /> Loading Telegram configurations...
      </div>
    );
  }

  const isConnected = settings.active && settings.botTokenConfigured;

  return (
    <div 
      className="dashboard-card"
      style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '32px', 
            height: '32px', 
            borderRadius: 'var(--radius-sm)', 
            background: 'var(--color-rgb-255-255-255-0-01)', 
            border: '1px solid var(--border-color)', 
            flexShrink: 0
          }}>
            <MessageCircle size={14} color="var(--text-muted)" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              Telegram Notifications
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.74rem', lineHeight: '1.4' }}>
              Dispatch real-time security telemetry and active incident reports directly to Telegram recipients.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleToggleMasterEnable}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: settings.active ? 'var(--status-healthy-bg)' : 'var(--color-rgb-255-255-255-0-015)',
              border: `1px solid ${settings.active ? 'var(--status-healthy)' : 'var(--border-color)'}`,
              color: settings.active ? 'var(--status-healthy)' : 'var(--text-muted)',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 500,
              height: '32px',
              transition: 'var(--transition)'
            }}
          >
            {settings.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
            {settings.active ? 'Active' : 'Disabled'}
          </button>

          <button
            type="button"
            onClick={handleSendActiveAlerts}
            disabled={sendingActive || !settings.active}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: activeAlertCount > 0 ? 'var(--status-danger-bg)' : 'var(--color-rgb-255-255-255-0-015)',
              border: `1px solid ${activeAlertCount > 0 ? 'var(--status-danger)' : 'var(--border-color)'}`,
              color: activeAlertCount > 0 ? 'var(--status-danger)' : 'var(--text-muted)',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: (sendingActive || !settings.active) ? 'not-allowed' : 'pointer',
              fontSize: '0.72rem',
              fontWeight: 500,
              height: '32px',
              opacity: (sendingActive || !settings.active) ? 0.5 : 1,
              transition: 'var(--transition)'
            }}
          >
            <Bell size={11} />
            {sendingActive ? 'Sending...' : `Send Active Alerts${activeAlertCount > 0 ? ` (${activeAlertCount})` : ''}`}
          </button>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing || !settings.active}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--text-primary)',
              border: 'none',
              color: 'var(--bg-primary)',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: (testing || !settings.active) ? 'not-allowed' : 'pointer',
              fontSize: '0.72rem',
              fontWeight: 500,
              opacity: (testing || !settings.active) ? 0.5 : 1,
              height: '32px',
              transition: 'var(--transition)'
            }}
          >
            <Send size={11} />
            {testing ? 'Sending Test...' : 'Send Test Alert'}
          </button>
        </div>
      </div>

      {/* Connection Info Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-rgb-255-255-255-0-003)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        fontSize: '0.72rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={12} color={settings.botTokenConfigured ? 'var(--status-healthy)' : 'var(--status-danger)'} />
          <span style={{ color: 'var(--text-secondary)' }}>
            Token Status: <strong style={{ color: 'var(--text-primary)' }}>{settings.botTokenConfigured ? 'Configured (.env)' : 'Missing'}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Active Connections: <strong style={{ color: 'var(--text-primary)' }}>{settings.recipients?.filter(r => r.active).length || 0}</strong>
          </span>
        </div>

        <div>
          {isConnected ? (
            <span style={{ color: 'var(--status-healthy)', fontWeight: 600, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--status-healthy-bg)', border: '1px solid rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '10px' }}>
              ● Live
            </span>
          ) : (
            <span style={{ color: settings.active ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.04em', background: settings.active ? 'var(--status-danger-bg)' : 'var(--color-rgb-255-255-255-0-01)', border: `1px solid ${settings.active ? 'rgba(239, 68, 68, 0.12)' : 'var(--border-color)'}`, padding: '2px 8px', borderRadius: '10px' }}>
              ● Offline
            </span>
          )}
        </div>
      </div>

      {/* Error & Success Messages */}
      {successMsg && (
        <div style={{ background: 'var(--status-healthy-bg)', border: '1px solid rgba(16, 185, 129, 0.15)', color: 'var(--status-healthy)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: 'var(--status-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--status-danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('configured')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 0 10px 0',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: activeTab === 'configured' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'configured' ? '2px solid var(--text-primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'var(--transition)'
          }}
        >
          <MessageCircle size={13} />
          Configured Recipients ({settings.recipients?.length || 0})
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 0 10px 0',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: activeTab === 'pending' ? 'var(--status-warning)' : 'var(--text-muted)',
            borderBottom: activeTab === 'pending' ? '2px solid var(--status-warning)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'var(--transition)'
          }}
        >
          <UserPlus size={13} />
          Pending Approvals
          {pendingChats.length > 0 && (
            <span style={{
              background: 'var(--status-warning)',
              color: '#000',
              padding: '1px 5px',
              borderRadius: '10px',
              fontSize: '0.62rem',
              fontWeight: 700
            }}>
              {pendingChats.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'configured' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add Recipient Form Inline */}
          <form onSubmit={handleAddRecipient} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '180px', background: 'var(--color-rgb-255-255-255-0-015)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0 10px', height: '34px', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Recipient label (e.g. SOC Team)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '0.74rem' }}
              />
            </div>

            <div style={{ flex: '1.2', minWidth: '200px', background: 'var(--color-rgb-255-255-255-0-015)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0 10px', height: '34px', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Telegram Chat ID (e.g. 5587057392)"
                value={newChatId}
                onChange={e => setNewChatId(e.target.value)}
                required
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '0.74rem', fontFamily: 'monospace' }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: 'var(--color-rgb-255-255-255-0-02)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                padding: '0 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', height: '34px', transition: 'var(--transition)'
              }}
            >
              <Plus size={13} /> Add Chat ID
            </button>
          </form>

          {/* Recipients List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(!settings.recipients || settings.recipients.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                No Telegram chats configured. Use Pending Approvals or input manually above.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {settings.recipients.map((rcp, idx) => (
                  <div
                    key={rcp.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: idx < settings.recipients.length - 1 ? '1px solid var(--border-color)' : 'none',
                      background: rcp.active ? 'transparent' : 'var(--color-rgb-255-255-255-0-003)',
                      opacity: rcp.active ? 1 : 0.6,
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <MessageCircle size={14} color={rcp.active ? 'var(--status-healthy)' : 'var(--text-muted)'} />
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {rcp.name || 'Unnamed Recipient'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {rcp.chatId}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(rcp.id)}
                        style={{
                          background: rcp.active ? 'var(--status-healthy-bg)' : 'var(--color-rgb-255-255-255-0-015)',
                          border: `1px solid ${rcp.active ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                          color: rcp.active ? 'var(--status-healthy)' : 'var(--text-muted)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.66rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        {rcp.active ? 'Active' : 'Paused'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(rcp.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'var(--transition)'
                        }}
                        title="Remove Chat"
                      >
                        <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingChats.length === 0 ? (
            <div style={{
              padding: '28px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={16} style={{ color: 'var(--text-muted)' }} />
              <span>No pending approval requests.</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Tell users to click <strong>/start</strong> on your bot to populate this queue automatically.
              </span>
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--status-warning)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden'
            }}>
              {pendingChats.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--status-warning-bg)',
                    borderBottom: i < pendingChats.length - 1 ? '1px solid rgba(245, 158, 11, 0.1)' : 'none',
                    padding: '12px 16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: '50%',
                      padding: '5px',
                      display: 'flex'
                    }}>
                      <UserPlus size={13} color="var(--status-warning)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        @{c.username}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        Chat ID: {c.chatId}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleApprovePending(c)}
                    style={{
                      background: 'var(--status-healthy-bg)',
                      border: '1px solid var(--status-healthy)',
                      color: 'var(--status-healthy)',
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.70rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'var(--transition)'
                    }}
                  >
                    Approve Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
