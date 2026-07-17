import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, Key, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      
      if (data.success) {
        login(data.token);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Backend might be unreachable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--color-hex-09090b)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '56px', height: '56px', 
            borderRadius: '50%', 
            background: 'var(--color-rgb-255-255-255-0-03)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--color-rgb-255-255-255-0-05)'
          }}>
            <Shield size={28} color="var(--status-healthy)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 6px 0' }}>Sentinel Dashboard</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Restricted access. Please authenticate to proceed.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ 
            display: 'flex', alignItems: 'flex-start', gap: '8px', 
            background: 'var(--status-danger-bg)', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--status-danger)', 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Master Password</label>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-sm)',
              padding: '0 12px',
              height: '42px',
              transition: 'border-color 0.2s ease',
              ':focus-within': { borderColor: 'var(--text-secondary)' }
            }}>
              <Key size={16} color="var(--text-muted)" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password..."
                style={{ 
                  background: 'transparent', border: 'none', outline: 'none', 
                  color: 'var(--text-primary)', width: '100%', fontSize: '0.9rem',
                  fontFamily: 'monospace'
                }}
                autoFocus
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !password}
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: isSubmitting || !password ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !password ? 0.6 : 1,
              transition: 'opacity 0.2s ease'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader size={16} className="spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Lock size={16} />
                Unlock Dashboard
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          Protected by AES-256 JWT & Rate Limiting
        </div>
      </div>
    </div>
  );
}
