// In development, Vite will proxy /api to the backend. In production, Nginx handles it.
const BACKEND_URL = '/api/metrics';

export async function fetchServerMetrics() {
  try {
    // CPU usage over the last 1 minute
    const cpuQuery = '100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)';
    
    // Memory usage: 100 * (1 - (Available / Total))
    const memQuery = '100 * (1 - (avg by (host_name) (node_memory_MemAvailable_bytes) / avg by (host_name) (node_memory_MemTotal_bytes)))';
    
    // Fetch from our secure Node.js backend
    const [cpuResponse, memResponse] = await Promise.all([
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cpuQuery })
      }),
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: memQuery })
      })
    ]);
    
    if (!cpuResponse.ok || !memResponse.ok) throw new Error('Failed to fetch from Backend');
    
    const cpuData = await cpuResponse.json();
    const memData = await memResponse.json();
    
    return { 
      success: true, 
      cpu: cpuData.data?.result || [],
      mem: memData.data?.result || []
    };
  } catch (error) {
    console.error("Backend API Error:", error);
    return { error: 'fetch_failed', message: error.message };
  }
}
