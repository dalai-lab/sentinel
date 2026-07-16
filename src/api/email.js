const API_BASE = '/api/email';

export async function fetchEmailSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to fetch email settings:', err);
    throw err;
  }
}

export async function saveEmailSettings(settings) {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to save email settings:', err);
    throw err;
  }
}

export async function addRecipient(name, email) {
  try {
    const res = await fetch(`${API_BASE}/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const json = await res.json();
    if (json.status === 'error') throw new Error(json.message);
    return json.data;
  } catch (err) {
    console.error('Failed to add recipient:', err);
    throw err;
  }
}

export async function removeRecipient(id) {
  try {
    const res = await fetch(`${API_BASE}/recipients/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to remove recipient:', err);
    throw err;
  }
}

export async function toggleRecipient(id) {
  try {
    const res = await fetch(`${API_BASE}/recipients/${id}/toggle`, {
      method: 'PATCH'
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to toggle recipient:', err);
    throw err;
  }
}

export async function sendTestEmail(email) {
  try {
    const res = await fetch(`${API_BASE}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const json = await res.json();
    if (json.status === 'error') throw new Error(json.message);
    return json;
  } catch (err) {
    console.error('Failed to dispatch test email:', err);
    throw err;
  }
}