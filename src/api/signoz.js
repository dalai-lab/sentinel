// In development, Vite will proxy /api to the backend. In production, Nginx handles it.
const BACKEND_URL = '/api/metrics';

export async function fetchServerMetrics() {
  try {
    // CPU usage over the last 1 minute
    const cpuQuery = '100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)';
    
    // Memory usage: 100 * (1 - (Available / Total))
    const memQuery = '100 * (1 - (avg by (host_name) (node_memory_MemAvailable_bytes) / avg by (host_name) (node_memory_MemTotal_bytes)))';

    // Disk usage percentage on root filesystem
    const diskQuery = '100 - ((avg by (host_name) (node_filesystem_avail_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}) * 100) / avg by (host_name) (node_filesystem_size_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}))';

    // System uptime in seconds
    const uptimeQuery = 'time() - max by (host_name) (node_boot_time_seconds)';
    
    // Fetch from our secure Node.js backend
    const [cpuResponse, memResponse, diskResponse, uptimeResponse] = await Promise.all([
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cpuQuery })
      }),
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: memQuery })
      }),
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: diskQuery })
      }),
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: uptimeQuery })
      })
    ]);
    
    if (!cpuResponse.ok || !memResponse.ok || !diskResponse.ok || !uptimeResponse.ok) throw new Error('Failed to fetch from Backend');
    
    const cpuData = await cpuResponse.json();
    const memData = await memResponse.json();
    const diskData = await diskResponse.json();
    const uptimeData = await uptimeResponse.json();
    
    return { 
      success: true, 
      cpu: cpuData.data?.result || [],
      mem: memData.data?.result || [],
      disk: diskData.data?.result || [],
      uptime: uptimeData.data?.result || []
    };
  } catch (error) {
    console.error("Backend API Error:", error);
    return { error: 'fetch_failed', message: error.message };
  }
}

export async function fetchActiveAlerts() {
  try {
    const response = await fetch(`${BACKEND_URL}/alerts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch alerts from Backend');
    return await response.json();
  } catch (error) {
    console.error("Backend API Alerts Error:", error);
    return [];
  }
}
