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

  const getSliderStyle = (val) => {
    const v = val ?? 50;
    const pct = ((v - 10) / 90) * 100;
    return {
      background: `linear-gradient(to right, var(--text-primary) 0%, var(--text-primary) ${pct}%, rgba(255, 255, 255, 0.08) ${pct}%, rgba(255, 255, 255, 0.08) 100%)`
    };
  };

  const inputsDisabled = selectedScope !== 'global' && !isOverridden;

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Telemetry Alert Thresholds</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            Set system resource limits that trigger alerts across global or individual server scopes.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.01)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <Filter size={12} color="var(--text-muted)" />
          <select 
            value={selectedScope}
            onChange={e => setSelectedScope(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.74rem',
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
          background: isOverridden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
          border: `1px solid ${isOverridden ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`,
          borderRadius: '4px',
          padding: '10px 14px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: isOverridden ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
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
          background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Cpu size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>CPU Threshold</span>
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
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {currentVals.cpuThreshold ?? 85}%
            </span>
          </div>
        </div>

        {/* RAM Threshold */}
        <div style={{
          background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Server size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>RAM Threshold</span>
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
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {currentVals.ramThreshold ?? 90}%
            </span>
          </div>
        </div>

        {/* Disk Threshold */}
        <div style={{
          background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <HardDrive size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>Disk Threshold</span>
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
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {currentVals.diskThreshold ?? 90}%
            </span>
          </div>
        </div>

        {/* Antivirus Toggle */}
        <div style={{
          background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>Antivirus Scanning Alerts</span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={currentVals.enableAntivirusAlerts ?? true}
              onChange={(e) => handleChange('enableAntivirusAlerts', e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--text-primary)' }}
            />
            <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: (currentVals.enableAntivirusAlerts ?? true) ? 'var(--status-healthy)' : 'var(--text-muted)', fontWeight: 600 }}>
              {(currentVals.enableAntivirusAlerts ?? true) ? 'Active' : 'Disabled'}
            </span>
          </label>
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
            borderRadius: '4px',
            fontWeight: 600,
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
