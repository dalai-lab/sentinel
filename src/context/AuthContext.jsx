import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => sessionStorage.getItem('dashboard_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          setIsAuthenticated(true);
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (err) {
        console.error('Session verification failed', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    verifySession();
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
    setIsAuthenticated(true);
    // Keep in session storage so it survives refresh, but not in localStorage to avoid persistent XSS theft
    sessionStorage.setItem('dashboard_token', newToken);
  };

  const logout = () => {
    setToken(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('dashboard_token');
  };

  // Intercept all fetch requests to inject the token
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      let [resource, config] = args;
      
      // Only inject token for backend API calls
      if (typeof resource === 'string' && resource.includes('/api/')) {
        config = config || {};
        config.headers = {
          ...config.headers,
        };
        // Use the current token from sessionStorage to ensure latest is used even outside React render cycle
        const currentToken = sessionStorage.getItem('dashboard_token');
        if (currentToken) {
          config.headers['Authorization'] = `Bearer ${currentToken}`;
        }
      }
      
      const response = await originalFetch(resource, config);
      
      // Auto-logout if unauthorized (except for login itself)
      if (response.status === 401 && !resource.includes('/api/auth/login')) {
        logout();
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
