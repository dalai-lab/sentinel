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
          enableAntivirusAlerts: prev.enableAntivirusAlerts
        };
        return next;
      });
    }
  };

  if (!settings) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading alert settings...</div>;
  }

  // Determine current active values based on scope and override state
  let currentVals = {
    cpuThreshold: settings.cpuThreshold,
    ramThreshold: settings.ramThreshold,
    diskThreshold: settings.diskThreshold,
    enableAntivirusAlerts: settings.enableAntivirusAlerts
  };

  if (selectedScope !== 'global' && isOverridden && settings.overrides[selectedScope]) {
    currentVals = { ...currentVals, ...settings.overrides[selectedScope] };
  }

  const inputsDisabled = selectedScope !== 'global' && !isOverridden;

  return (
    <div style={{
      background: 'rgba(20, 20, 25, 0.4)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 600 }}>Alert Thresholds</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '600px' }}>
            Configure the specific system thresholds that will trigger critical alerts. You can set global defaults or override them for specific servers.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select 
            value={selectedScope}
            onChange={e => setSelectedScope(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {SERVER_LIST.map(s => (
              <option key={s.id} value={s.id} style={{ background: '#1e1e24' }}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedScope !== 'global' && (
        <div style={{
          background: isOverridden ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${isOverridden ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: isOverridden ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              Override Global Settings
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              If disabled, this server will inherit the Global Settings.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isOverridden}
              onChange={(e) => toggleOverride(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent)' }}
            />
          </label>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', opacity: inputsDisabled ? 0.5 : 1, pointerEvents: inputsDisabled ? 'none' : 'auto' }}>
        
        {/* CPU Threshold */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Cpu size={18} color="var(--accent)" />
            <span style={{ fontWeight: 600 }}>CPU Usage Threshold</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input 
              type="range" 
              min="10" max="100" 
              value={currentVals.cpuThreshold ?? 85} 
              onChange={(e) => handleChange('cpuThreshold', parseInt(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', width: '50px', textAlign: 'right' }}>
              {currentVals.cpuThreshold ?? 85}%
            </span>
          </div>
        </div>

        {/* RAM Threshold */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Server size={18} color="#10b981" />
            <span style={{ fontWeight: 600 }}>RAM Usage Threshold</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input 
              type="range" 
              min="10" max="100" 
              value={currentVals.ramThreshold ?? 90} 
              onChange={(e) => handleChange('ramThreshold', parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#10b981' }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', width: '50px', textAlign: 'right' }}>
              {currentVals.ramThreshold ?? 90}%
            </span>
          </div>
        </div>

        {/* Disk Threshold */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <HardDrive size={18} color="#f59e0b" />
            <span style={{ fontWeight: 600 }}>Disk Usage Threshold</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input 
              type="range" 
              min="10" max="100" 
              value={currentVals.diskThreshold ?? 90} 
              onChange={(e) => handleChange('diskThreshold', parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#f59e0b' }}
            />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', width: '50px', textAlign: 'right' }}>
              {currentVals.diskThreshold ?? 90}%
            </span>
          </div>
        </div>

        {/* Antivirus Toggle */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#ef4444" />
            <span style={{ fontWeight: 600 }}>Antivirus Alerts</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={currentVals.enableAntivirusAlerts ?? true}
              onChange={(e) => handleChange('enableAntivirusAlerts', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: '#ef4444' }}
            />
            <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: (currentVals.enableAntivirusAlerts ?? true) ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {(currentVals.enableAntivirusAlerts ?? true) ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
        {saveMessage && (
          <span style={{ color: saveMessage.includes('successfully') ? '#10b981' : '#ef4444', fontSize: '0.9rem' }}>
            {saveMessage}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s',
            opacity: saving ? 0.7 : 1
          }}
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
