const API_BASE = '/api/alerts';

export async function fetchAlerts() {
  const res = await fetch(API_BASE);
  const data = await res.json();
  return data.data || [];
}

export async function fetchAlertSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  const data = await res.json();
  return data.data || {};
}

export async function updateAlertSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  const data = await res.json();
  return data.data || {};
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`${API_BASE}/${alertId}/acknowledge`, {
    method: 'POST'
  });
  return res.json();
}
