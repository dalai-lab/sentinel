import React, { useState, useEffect } from 'react';
import { Save, Server, Cpu, HardDrive, Shield, Filter } from 'lucide-react';
import { fetchAlertSettings, updateAlertSettings } from '../api/alerts';

const SERVER_LIST = [
  { id: 'global', name: 'Global Settings (Default)' },
  { id: 'instance-20260630-1713', name: 'Oracle database server' },
  { id: 'srv1213878', name: 'Orbithyre' },
  { id: 'srv1176513', name: 'Gaplytiq' },
  { id: 'srv1055295', name: 'Dalai' }
];

export default function AlertSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [selectedScope, setSelectedScope] = useState('global');
  const [isOverridden, setIsOverridden] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchAlertSettings();
      // ensure overrides exists
      if (!data.overrides) data.overrides = {};
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (settings && selectedScope !== 'global') {
      setIsOverridden(!!settings.overrides[selectedScope]);
    } else {
      setIsOverridden(true); // global is always "enabled"
    }
  }, [selectedScope, settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAlertSettings(settings);
      setSaveMessage('Settings saved successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => {
      const next = { ...prev };
      if (selectedScope === 'global') {
        next[key] = value;
      } else {
        if (!next.overrides[selectedScope]) {
          next.overrides[selectedScope] = {};
        }
        next.overrides[selectedScope][key] = value;
      }
      return next;
    });
  };

  const toggleOverride = (enabled) => {
    setIsOverridden(enabled);
    if (!enabled && selectedScope !== 'global') {
      setSettings(prev => {
        const next = { ...prev };
        delete next.overrides[selectedScope];
        return next;
      });
    } else if (enabled && selectedScope !== 'global') {
      setSettings(prev => {
        const next = { ...prev };
        next.overrides[selectedScope] = {
          cpuThreshold: prev.cpuThreshold,
          ramThreshold: prev.ramThreshold,
          diskThreshold: prev.diskThreshold,
          enableAntivirusAlerts: prev.enableAntivirusAlerts,
          sendAntivirusReportEmail: prev.sendAntivirusReportEmail,
          sendAntivirusReportTelegram: prev.sendAntivirusReportTelegram
        };
        return next;
      });
    }
  };

  if (!settings) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Loading alert settings...</div>;
  }

  // Determine current active values based on scope and override state
  let currentVals = {
    cpuThreshold: settings.cpuThreshold,
    ramThreshold: settings.ramThreshold,
    diskThreshold: settings.diskThreshold,
    enableAntivirusAlerts: settings.enableAntivirusAlerts,
    sendAntivirusReportEmail: settings.sendAntivirusReportEmail,
    sendAntivirusReportTelegram: settings.sendAntivirusReportTelegram
  };

  if (selectedScope !== 'global' && isOverridden && settings.overrides[selectedScope]) {
    currentVals = { ...currentVals, ...settings.overrides[selectedScope] };
  }

  const getSliderStyle = (val) => {
    const v = val ?? 50;
    const pct = ((v - 10) / 90) * 100;
    return {
      background: `linear-gradient(to right, var(--text-primary) 0%, var(--text-primary) ${pct}%, var(--color-rgb-255-255-255-0-05) ${pct}%, var(--color-rgb-255-255-255-0-05) 100%)`
    };
  };

  const inputsDisabled = selectedScope !== 'global' && !isOverridden;

  return (
    <div style={{
      background: 'var(--color-rgb-255-255-255-0-005)',
      border: '1px solid var(--color-rgb-255-255-255-0-03)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div className="settings-header">
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>Telemetry Alert Thresholds</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            Set system resource limits that trigger alerts across global or individual server scopes.
          </p>
        </div>
        
        <div className="settings-header-scope">
          <Filter size={12} color="var(--text-muted)" />
          <select 
            value={selectedScope}
            onChange={e => setSelectedScope(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.74rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {SERVER_LIST.map(s => (
              <option key={s.id} value={s.id} style={{ background: 'var(--color-hex-09090b)' }}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedScope !== 'global' && (
        <div style={{
          background: isOverridden ? 'var(--color-rgb-16-185-129-0-02)' : 'var(--color-rgb-255-255-255-0-01)',
          border: `1px solid ${isOverridden ? 'var(--color-rgb-16-185-129-0-15)' : 'var(--color-rgb-255-255-255-0-02)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 500, color: isOverridden ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              Server Override Active
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Enable to set custom limits for this specific host.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isOverridden}
              onChange={(e) => toggleOverride(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--text-primary)' }}
            />
          </label>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', opacity: inputsDisabled ? 0.5 : 1, pointerEvents: inputsDisabled ? 'none' : 'auto' }}>
        
        {/* CPU Threshold */}
        <div style={{
          background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--color-rgb-255-255-255-0-02)', borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Cpu size={14} color="var(--text-muted)" />
            <span style={{ fontWeight: 500, fontSize: '0.76rem', color: 'var(--text-primary)' }}>CPU Threshold</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="range" 
              min="10" max="100" 
              value={currentVals.cpuThreshold ?? 85} 
              onChange={(e) => handleChange('cpuThreshold', parseInt(e.target.value))}
              className="minimal-range"
              style={getSliderStyle(currentVals.cpuThreshold ?? 85)}
            />
            <span style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--text-primary)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {currentVals.cpuThreshold ?? 85}%
            </span>
          </div>
        </div>

        {/* RAM Threshold */}
        <div style={{
          background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--color-rgb-255-255-255-0-02)', borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Server size={14} color="var(--text-muted)" />
            <span style={{ fontWeight: 500, fontSize: '0.76rem', color: 'var(--text-primary)' }}>RAM Threshold</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="range" 
              min="10" max="100" 
              value={currentVals.ramThreshold ?? 90} 
              onChange={(e) => handleChange('ramThreshold', parseInt(e.target.value))}
              className="minimal-range"
              style={getSliderStyle(currentVals.ramThreshold ?? 90)}
            />
            <span style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--text-primary)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {currentVals.ramThreshold ?? 90}%
            </span>
          </div>
        </div>

        {/* Disk Threshold */}
        <div style={{
          background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--color-rgb-255-255-255-0-02)', borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <HardDrive size={14} color="var(--text-muted)" />
            <span style={{ fontWeight: 500, fontSize: '0.76rem', color: 'var(--text-primary)' }}>Disk Threshold</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="range" 
              min="10" max="100" 
              value={currentVals.diskThreshold ?? 90} 
              onChange={(e) => handleChange('diskThreshold', parseInt(e.target.value))}
              className="minimal-range"
              style={getSliderStyle(currentVals.diskThreshold ?? 90)}
            />
            <span style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--text-primary)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {currentVals.diskThreshold ?? 90}%
            </span>
          </div>
        </div>

        {/* Antivirus Toggle */}
        <div style={{
          background: 'var(--color-rgb-255-255-255-0-01)', border: '1px solid var(--color-rgb-255-255-255-0-02)', borderRadius: 'var(--radius-sm)', padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="var(--text-muted)" />
              <span style={{ fontWeight: 500, fontSize: '0.76rem', color: 'var(--text-primary)' }}>Antivirus Scan Alerts</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={currentVals.enableAntivirusAlerts ?? true}
                onChange={(e) => handleChange('enableAntivirusAlerts', e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--text-primary)' }}
              />
              <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: (currentVals.enableAntivirusAlerts ?? true) ? 'var(--status-healthy)' : 'var(--text-muted)', fontWeight: 500 }}>
                {(currentVals.enableAntivirusAlerts ?? true) ? 'Active' : 'Disabled'}
              </span>
            </label>
          </div>

          {(currentVals.enableAntivirusAlerts ?? true) && (
            <div style={{ 
              display: 'flex', flexDirection: 'column', gap: '8px', 
              paddingTop: '12px', borderTop: '1px solid var(--color-rgb-255-255-255-0-03)' 
            }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Clean Scan Reports Destinations</span>
              
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Send via Email</span>
                <input 
                  type="checkbox" 
                  checked={currentVals.sendAntivirusReportEmail ?? true}
                  onChange={(e) => handleChange('sendAntivirusReportEmail', e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--text-primary)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Send via Telegram</span>
                <input 
                  type="checkbox" 
                  checked={currentVals.sendAntivirusReportTelegram ?? true}
                  onChange={(e) => handleChange('sendAntivirusReportTelegram', e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--text-primary)' }}
                />
              </label>
            </div>
          )}
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
        {saveMessage && (
          <span style={{ color: saveMessage.includes('successfully') ? 'var(--status-healthy)' : 'var(--status-danger)', fontSize: '0.74rem' }}>
            {saveMessage}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            padding: '5px 14px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '0.72rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'opacity 0.15s',
            opacity: saving ? 0.7 : 1
          }}
        >
          <Save size={12} />
          {saving ? 'Saving…' : 'Save Thresholds'}
        </button>
      </div>
    </div>
  );
}
