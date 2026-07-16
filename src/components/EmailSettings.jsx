import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Send, Check, AlertCircle, RefreshCw, ToggleLeft, ToggleRight, Shield } from 'lucide-react';
import { fetchEmailSettings, saveEmailSettings, addRecipient, removeRecipient, toggleRecipient, sendTestEmail } from '../api/email';

export default function EmailSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchEmailSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load email settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    try {
      setErrorMsg('');
      const updatedRecipients = await addRecipient(newName, newEmail);
      setSettings(prev => ({ ...prev, recipients: updatedRecipients }));
      setNewEmail('');
      setNewName('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add recipient');
    }
  };

  const handleRemove = async (id) => {
    try {
      const updatedRecipients = await removeRecipient(id);
      setSettings(prev => ({ ...prev, recipients: updatedRecipients }));
    } catch (err) {
      setErrorMsg('Failed to remove recipient');
    }
  };

  const handleToggle = async (id) => {
    try {
      const updatedRecipients = await toggleRecipient(id);
      setSettings(prev => ({ ...prev, recipients: updatedRecipients }));
    } catch (err) {
      setErrorMsg('Failed to toggle recipient');
    }
  };

  const handleSeverityChange = async (severityKey, val) => {
    const updated = {
      ...settings,
      severities: {
        ...settings.severities,
        [severityKey]: val
      }
    };
    setSettings(updated);
    try {
      await saveEmailSettings(updated);
    } catch (err) {
      setErrorMsg('Failed to update severity settings');
    }
  };

  const handleToggleMasterEnable = async () => {
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    try {
      await saveEmailSettings(updated);
    } catch (err) {
      setErrorMsg('Failed to toggle email service');
    }
  };

  const handleSendTest = async (targetEmail = null) => {
    setTesting(true);
    setTestSuccess('');
    setErrorMsg('');
    try {
      const res = await sendTestEmail(targetEmail);
      setTestSuccess(`Test email dispatched successfully to ${res.data.recipients.join(', ')}.`);
      setTimeout(() => setTestSuccess(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch test email.');
    } finally {
      setTesting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
        <RefreshCw size={14} className="spin" /> Loading email alert configurations...
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px', display: 'flex' }}>
              <Mail size={14} color="var(--text-secondary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Email Notifications</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            Assign email recipients to receive alert reports, security notifications, and incident dispatches.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleToggleMasterEnable}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: settings.enabled ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.01)',
              border: `1px solid ${settings.enabled ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`,
              color: settings.enabled ? 'var(--status-healthy)' : 'var(--text-muted)',
              padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600
            }}
          >
            {settings.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {settings.enabled ? 'Active' : 'Disabled'}
          </button>

          <button
            type="button"
            onClick={() => handleSendTest()}
            disabled={testing || !settings.enabled}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)',
              padding: '5px 12px', borderRadius: '4px', cursor: testing ? 'default' : 'pointer',
              fontSize: '0.72rem', fontWeight: 600, opacity: (testing || !settings.enabled) ? 0.5 : 1
            }}
          >
            <Send size={11} />
            {testing ? 'Sending Test…' : 'Send Test Mail'}
          </button>
        </div>
      </div>

      {/* Connection Info Banner */}
      <div style={{
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Shield size={12} color="var(--status-healthy)" />
          <span><strong>SMTP Server:</strong> {settings.smtpHost || 'smtp.zeptomail.in'}:587</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span><strong>From Email:</strong> info@orbithyre.com</span>
        </div>
        <span style={{ color: 'var(--status-healthy)', fontWeight: 600, fontSize: '0.65rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 6px', borderRadius: '3px' }}>
          ✓ Connected
        </span>
      </div>

      {/* Notifications Feedback */}
      {testSuccess && (
        <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--status-healthy)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={14} /> {testSuccess}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--status-danger)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Add Recipient Form */}
      <form onSubmit={handleAddRecipient} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '160px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 8px' }}>
          <input
            type="text"
            placeholder="Recipient Name (e.g. Sales Desk)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '6px 4px', width: '100%', outline: 'none', fontSize: '0.74rem' }}
          />
        </div>
        <div style={{ flex: '1.5', minWidth: '220px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 8px' }}>
          <input
            type="email"
            placeholder="Email Address (e.g. sales@orbithyre.com)"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '6px 4px', width: '100%', outline: 'none', fontSize: '0.74rem' }}
          />
        </div>
        <button
          type="submit"
          style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
            padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <Plus size={12} /> Add Recipient
        </button>
      </form>

      {/* Assigned Recipients List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Configured Mail Recipients ({settings.recipients ? settings.recipients.length : 0})
        </div>

        {(!settings.recipients || settings.recipients.length === 0) ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            No recipients configured. Add email addresses above to begin receiving alert dispatches.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            {settings.recipients.map((rcp, idx) => (
              <div
                key={rcp.id || idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderBottom: idx < settings.recipients.length - 1 ? '1px solid var(--border-color)' : 'none',
                  background: rcp.active ? 'transparent' : 'rgba(255,255,255,0.01)', opacity: rcp.active ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={12} color={rcp.active ? 'var(--status-healthy)' : 'var(--text-muted)'} />
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)', marginRight: '6px' }}>{rcp.name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>&lt;{rcp.email}&gt;</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleSendTest(rcp.email)}
                    style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '3px', fontSize: '0.65rem', cursor: 'pointer' }}
                    title="Send test to this address"
                  >
                    Test Mail
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(rcp.id)}
                    style={{
                      background: rcp.active ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.01)',
                      border: `1px solid ${rcp.active ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`,
                      color: rcp.active ? 'var(--status-healthy)' : 'var(--text-muted)',
                      padding: '2px 6px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer'
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

      {/* Severity Trigger Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Alert Severity Dispatch Triggers
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { key: 'critical', label: 'Critical Incidents (CPU/Disk Overflow)', color: 'var(--status-danger)' },
            { key: 'high', label: 'High Severity Threats (Viruses, SSH Spikes)', color: 'var(--status-warning)' },
            { key: 'warning', label: 'Warning Anomalies', color: 'var(--status-warning)' },
            { key: 'info', label: 'Informational Logs', color: 'var(--text-muted)' },
          ].map(sev => (
            <label key={sev.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={!!settings.severities?.[sev.key]}
                onChange={e => handleSeverityChange(sev.key, e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--text-primary)' }}
              />
              <span style={{ fontWeight: settings.severities?.[sev.key] ? 600 : 400 }}>{sev.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}