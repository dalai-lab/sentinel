import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Check, AlertCircle, RefreshCw, ToggleLeft, ToggleRight, Shield, MessageCircle, Clock, UserPlus } from 'lucide-react';

export default function TelegramSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [botToken, setBotToken] = useState('');
  const [newName, setNewName] = useState('');
  const [newChatId, setNewChatId] = useState('');
  
  const [testing, setTesting] = useState(false);
  const [pendingChats, setPendingChats] = useState([]);
  const [activeTab, setActiveTab] = useState('configured');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-poll for pending approvals every 5 seconds if token exists
  useEffect(() => {
    if (!botToken) return;
    
    const pollPending = async () => {
      try {
        const res = await fetch('/api/telegram/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken })
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
  }, [botToken, settings?.recipients]); // re-poll if recipients change so it clears approved ones

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/settings');
      const json = await res.json();
      if (json.status === 'success') {
        setSettings(json.data);
        setBotToken(json.data.botToken || '');
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

  const handleSaveCredentials = (e) => {
    e.preventDefault();
    if (!botToken) {
      setErrorMsg('Bot Token is required.');
      return;
    }
    setErrorMsg('');
    handleSaveSettings({ botToken });
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
  }

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

  if (loading || !settings) {
    return (
      <div style={{ background: 'var(--color-rgb-255-255-255-0-005)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
        <RefreshCw size={12} className="spin" /> Loading Telegram configurations...
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-rgb-255-255-255-0-005)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Header */}
      <div className="settings-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px', display: 'flex' }}>
              <MessageCircle size={14} color="var(--text-muted)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>Telegram Notifications</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            Configure one or multiple Telegram chats to receive real-time security alerts.
          </p>
        </div>

        <div className="settings-header-actions">
          <button
            type="button"
            onClick={handleToggleMasterEnable}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: settings.active ? 'var(--color-rgb-16-185-129-0-04)' : 'var(--color-rgb-255-255-255-0-015)',
              border: `1px solid ${settings.active ? 'var(--color-rgb-16-185-129-0-15)' : 'var(--border-color)'}`,
              color: settings.active ? 'var(--status-healthy)' : 'var(--text-muted)',
              padding: '4px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500
            }}
          >
            {settings.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {settings.active ? 'Active' : 'Disabled'}
          </button>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing || !settings.active}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)',
              padding: '5px 12px', borderRadius: 'var(--radius-sm)', cursor: testing ? 'default' : 'pointer',
              fontSize: '0.72rem', fontWeight: 500, opacity: (testing || !settings.active) ? 0.5 : 1
            }}
          >
            <Send size={11} />
            {testing ? 'Sending Test…' : 'Test Telegram'}
          </button>
        </div>
      </div>

      {/* Connection Info Banner */}
      <div className="settings-connection-banner">
        <div className="settings-connection-info">
          <Shield size={12} color={settings.active && settings.botToken ? "var(--status-healthy)" : "var(--text-muted)"} />
          <span><strong>Bot Token:</strong> {settings.botToken ? 'Configured' : 'Missing'}</span>
          <span style={{ color: 'var(--text-muted)' }} className="bullet-sep">•</span>
          <span><strong>Active Chats:</strong> {settings.recipients?.filter(r => r.active).length || 0}</span>
        </div>
        {(settings.active && settings.botToken && settings.recipients?.length > 0) ? (
          <span style={{ color: 'var(--status-healthy)', fontWeight: 500, fontSize: '0.65rem', background: 'var(--color-rgb-16-185-129-0-04)', border: '1px solid var(--color-rgb-16-185-129-0-15)', padding: '1px 6px', borderRadius: '3px' }}>
            ✓ Connected
          </span>
        ) : (
          <span style={{ color: 'var(--status-warning)', fontWeight: 500, fontSize: '0.65rem', background: 'var(--color-rgb-245-158-11-0-04)', border: '1px solid var(--color-rgb-245-158-11-0-15)', padding: '1px 6px', borderRadius: '3px' }}>
            ! Incomplete Setup
          </span>
        )}
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div style={{ background: 'var(--color-rgb-16-185-129-0-04)', border: '1px solid var(--color-rgb-16-185-129-0-15)', color: 'var(--status-healthy)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={14} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: 'var(--color-rgb-239-68-68-0-04)', border: '1px solid var(--color-rgb-239-68-68-0-15)', color: 'var(--status-danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Setup Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <form onSubmit={handleSaveCredentials} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Bot Token (from @BotFather)</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:ABCdefGhiJKlmNoPQrsTUVwxyZ"
              className="settings-input"
              style={{ width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ height: '34px', padding: '0 16px' }}>Save Token</button>
        </form>
      </div>

      <div style={{ borderTop: '1px solid var(--color-rgb-255-255-255-0-03)', paddingTop: '20px' }}></div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-rgb-255-255-255-0-05)', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('configured')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0',
            fontSize: '0.78rem', fontWeight: 600,
            color: activeTab === 'configured' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'configured' ? '2px solid var(--text-primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <MessageCircle size={14} /> Configured Chats ({settings.recipients?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0',
            fontSize: '0.78rem', fontWeight: 600,
            color: activeTab === 'pending' ? 'var(--status-warning)' : 'var(--text-muted)',
            borderBottom: activeTab === 'pending' ? '2px solid var(--status-warning)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <UserPlus size={14} /> Pending Approvals 
          {pendingChats.length > 0 && (
            <span style={{ background: 'var(--status-warning)', color: '#000', padding: '1px 5px', borderRadius: '10px', fontSize: '0.65rem' }}>
              {pendingChats.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'configured' && (
        <>
          {/* Add Recipient Form */}
          <form onSubmit={handleAddRecipient} className="settings-recipient-form">
            <div style={{ flex: '1', minWidth: '160px', background: 'var(--color-rgb-255-255-255-0-015)', border: '1px solid var(--color-rgb-255-255-255-0-03)', borderRadius: 'var(--radius-sm)', padding: '0 8px' }}>
              <input
                type="text"
                placeholder="Recipient Name (e.g. IT Team)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '6px 4px', width: '100%', outline: 'none', fontSize: '0.74rem' }}
              />
            </div>
            <div style={{ flex: '1.5', minWidth: '220px', background: 'var(--color-rgb-255-255-255-0-015)', border: '1px solid var(--color-rgb-255-255-255-0-03)', borderRadius: 'var(--radius-sm)', padding: '0 8px' }}>
              <input
                type="text"
                placeholder="Chat ID (e.g. 12345678)"
                value={newChatId}
                onChange={e => setNewChatId(e.target.value)}
                required
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '6px 4px', width: '100%', outline: 'none', fontSize: '0.74rem' }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: 'var(--color-rgb-255-255-255-0-02)', border: '1px solid var(--color-rgb-255-255-255-0-03)', color: 'var(--text-primary)',
                padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Plus size={12} /> Add Chat ID
            </button>
          </form>

          {/* Assigned Recipients List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {(!settings.recipients || settings.recipients.length === 0) ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem', border: '1px solid var(--color-rgb-255-255-255-0-03)', borderRadius: 'var(--radius-sm)' }}>
                No Chat IDs configured. Check Pending Approvals or add manually above to begin receiving alerts.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--color-rgb-255-255-255-0-03)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {settings.recipients.map((rcp, idx) => (
                  <div
                    key={rcp.id || idx}
                    className="recipient-row"
                    style={{
                      borderBottom: idx < settings.recipients.length - 1 ? '1px solid var(--color-rgb-255-255-255-0-015)' : 'none',
                      background: rcp.active ? 'transparent' : 'var(--color-rgb-255-255-255-0-005)', opacity: rcp.active ? 1 : 0.6
                    }}
                  >
                    <div className="recipient-info">
                      <MessageCircle size={12} color={rcp.active ? 'var(--status-healthy)' : 'var(--text-muted)'} />
                      <div>
                        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-primary)', marginRight: '6px' }}>{rcp.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{rcp.chatId}</span>
                      </div>
                    </div>

                    <div className="recipient-actions">
                      <button
                        type="button"
                        onClick={() => handleToggle(rcp.id)}
                        style={{
                          background: rcp.active ? 'var(--color-rgb-16-185-129-0-04)' : 'var(--color-rgb-255-255-255-0-015)',
                          border: `1px solid ${rcp.active ? 'var(--color-rgb-16-185-129-0-15)' : 'var(--color-rgb-255-255-255-0-03)'}`,
                          color: rcp.active ? 'var(--status-healthy)' : 'var(--text-muted)',
                          padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.62rem', fontWeight: 500, cursor: 'pointer'
                        }}
                      >
                        {rcp.active ? 'Active' : 'Paused'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(rcp.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        title="Remove Recipient"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingChats.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem', border: '1px solid var(--color-rgb-255-255-255-0-03)', borderRadius: 'var(--radius-sm)' }}>
              <Clock size={16} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
              No pending approvals. When a user sends /start to your bot, they will automatically appear here.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--color-rgb-245-158-11-0-15)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {pendingChats.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-rgb-245-158-11-0-02)', borderBottom: i < pendingChats.length - 1 ? '1px solid var(--color-rgb-245-158-11-0-05)' : 'none', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--color-rgb-245-158-11-0-1)', borderRadius: '50%', padding: '6px' }}>
                      <UserPlus size={14} color="var(--status-warning)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.username}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Chat ID: {c.chatId}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApprovePending(c)}
                    style={{ background: 'var(--color-rgb-16-185-129-0-1)', border: '1px solid var(--color-rgb-16-185-129-0-2)', color: 'var(--status-healthy)', padding: '5px 14px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Approve Request
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
