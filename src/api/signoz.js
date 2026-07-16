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

    // Load Average (1m)
    const loadQuery = 'avg by (host_name) (node_load1)';

    // Net receive (bytes/sec)
    const netRecvQuery = 'sum by (host_name) (rate(node_network_receive_bytes_total{device=~"eth0|ens3|enp3s0|wlan0|bond0|enp0s3"}[1m]))';

    // Net transmit (bytes/sec)
    const netSentQuery = 'sum by (host_name) (rate(node_network_transmit_bytes_total{device=~"eth0|ens3|enp3s0|wlan0|bond0|enp0s3"}[1m]))';

    // Fetch from our secure Node.js backend
    const [cpuResponse, memResponse, diskResponse, uptimeResponse, loadResponse, netRecvResponse, netSentResponse] = await Promise.all([
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
      }),
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: loadQuery })
      }),
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: netRecvQuery })
      }),
      fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: netSentQuery })
      })
    ]);

    if (!cpuResponse.ok || !memResponse.ok || !diskResponse.ok || !uptimeResponse.ok || !loadResponse.ok || !netRecvResponse.ok || !netSentResponse.ok) {
      throw new Error('Failed to fetch from Backend');
    }

    const cpuData = await cpuResponse.json();
    const memData = await memResponse.json();
    const diskData = await diskResponse.json();
    const uptimeData = await uptimeResponse.json();
    const loadData = await loadResponse.json();
    const netRecvData = await netRecvResponse.json();
    const netSentData = await netSentResponse.json();

    return {
      success: true,
      cpu: cpuData.data?.result || [],
      mem: memData.data?.result || [],
      disk: diskData.data?.result || [],
      uptime: uptimeData.data?.result || [],
      load: loadData.data?.result || [],
      netRecv: netRecvData.data?.result || [],
      netSent: netSentData.data?.result || []
    };
  } catch (error) {
    console.error("Backend API Error:", error);
    return { error: 'fetch_failed', message: error.message };
  }
}

export async function fetchServerMetricsRange(timeRangeSeconds) {
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - timeRangeSeconds;
    // Step size logic: 60 data points maximum
    const step = Math.max(15, Math.floor(timeRangeSeconds / 60));

    const cpuQuery = '100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)';
    const memQuery = '100 * (1 - (avg by (host_name) (node_memory_MemAvailable_bytes) / avg by (host_name) (node_memory_MemTotal_bytes)))';
    const diskQuery = '100 - ((avg by (host_name) (node_filesystem_avail_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}) * 100) / avg by (host_name) (node_filesystem_size_bytes{mountpoint="/",fstype!~"rootfs|selinuxfs|autofs|rpc_pipefs|tmpfs|udev|none|devpts|pstore|securityfs|debugfs|bpf|tracefs|sysfs|cgroup|cgroup2|mqueue|systemd-1"}))';
    const netRecvQuery = 'sum by (host_name) (rate(node_network_receive_bytes_total{device=~"eth0|ens3|enp3s0|wlan0|bond0|enp0s3"}[5m]))';
    const netSentQuery = 'sum by (host_name) (rate(node_network_transmit_bytes_total{device=~"eth0|ens3|enp3s0|wlan0|bond0|enp0s3"}[5m]))';

    const fetchRange = (query) => fetch(`${BACKEND_URL}/range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, start, end, step })
    }).then(res => res.json());

    const [cpuData, memData, diskData, netRecvData, netSentData] = await Promise.all([
      fetchRange(cpuQuery),
      fetchRange(memQuery),
      fetchRange(diskQuery),
      fetchRange(netRecvQuery),
      fetchRange(netSentQuery)
    ]);

    return {
      success: true,
      cpu:     cpuData.data?.result     || [],
      mem:     memData.data?.result     || [],
      disk:    diskData.data?.result    || [],
      netRecv: netRecvData.data?.result || [],
      netSent: netSentData.data?.result || []
    };
  } catch (error) {
    console.error("Backend Range API Error:", error);
    return { error: 'fetch_failed', message: error.message };
  }
}

export async function fetchServerFullSpecs(hostName) {
  const post = (query) => fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  }).then(r => r.json()).catch(() => ({ data: { result: [] } }));

  const pick  = (d) => { const r = d?.data?.result?.[0]; return r ? parseFloat(r.value?.[1]) : null; };
  const lbl   = (d, k) => d?.data?.result?.[0]?.metric?.[k] || null;
  const sumAll = (d) => (d?.data?.result || []).reduce((s, r) => s + (parseFloat(r.value?.[1]) || 0), 0);

  const h = hostName; // shorthand for template literals

  const [
    cpuInfoData, unameData, osInfoData,
    memTotalData, memAvailData, memFreeData, memBuffData, memCacheData,
    swapTotalData, swapFreeData,
    diskSizeData, diskAvailData,
    diskReadRateData, diskWriteRateData,
    load5Data, load15Data,
    procsRunData, procsBlockData,
    netRecvTotalData, netSentTotalData,
    cpuCoresData
  ] = await Promise.all([
    post(`node_cpu_info{host_name="${h}"}`),
    post(`node_uname_info{host_name="${h}"}`),
    post(`node_os_info{host_name="${h}"}`),
    post(`node_memory_MemTotal_bytes{host_name="${h}"}`),
    post(`node_memory_MemAvailable_bytes{host_name="${h}"}`),
    post(`node_memory_MemFree_bytes{host_name="${h}"}`),
    post(`node_memory_Buffers_bytes{host_name="${h}"}`),
    post(`node_memory_Cached_bytes{host_name="${h}"}`),
    post(`node_memory_SwapTotal_bytes{host_name="${h}"}`),
    post(`node_memory_SwapFree_bytes{host_name="${h}"}`),
    post(`node_filesystem_size_bytes{mountpoint="/",host_name="${h}",fstype!~"rootfs|tmpfs|devtmpfs"}`),
    post(`node_filesystem_avail_bytes{mountpoint="/",host_name="${h}",fstype!~"rootfs|tmpfs|devtmpfs"}`),
    post(`rate(node_disk_read_bytes_total{host_name="${h}"}[2m])`),
    post(`rate(node_disk_written_bytes_total{host_name="${h}"}[2m])`),
    post(`node_load5{host_name="${h}"}`),
    post(`node_load15{host_name="${h}"}`),
    post(`node_procs_running{host_name="${h}"}`),
    post(`node_procs_blocked{host_name="${h}"}`),
    post(`sum(node_network_receive_bytes_total{host_name="${h}"})`),
    post(`sum(node_network_transmit_bytes_total{host_name="${h}"})`),
    post(`count(count(node_cpu_seconds_total{host_name="${h}"}) by (cpu)) by (host_name)`)
  ]);

  const memTotal = pick(memTotalData);
  const memAvail = pick(memAvailData);
  const swapTotal = pick(swapTotalData);
  const swapFree  = pick(swapFreeData);
  const diskTotal = pick(diskSizeData);
  const diskAvail = pick(diskAvailData);

  // CPU model: try several label names SigNoz/Prometheus may use
  const cpuResult = cpuInfoData?.data?.result?.[0];
  const cpuModelName = cpuResult?.metric?.model_name
    || cpuResult?.metric?.ModelName
    || cpuResult?.metric?.cpu_model
    || null;
  const cpuVendor = cpuResult?.metric?.vendor_id
    || cpuResult?.metric?.VendorID
    || cpuResult?.metric?.vendor
    || null;

  return {
    // CPU identity
    cpuModelName,
    cpuVendor,
    cpuCores:     pick(cpuCoresData),
    load5:        pick(load5Data),
    load15:       pick(load15Data),
    // Memory breakdown (bytes)
    memTotal,
    memUsed:    (memTotal != null && memAvail != null) ? memTotal - memAvail : null,
    memAvail,
    memFree:    pick(memFreeData),
    memBuffers: pick(memBuffData),
    memCached:  pick(memCacheData),
    swapTotal,
    swapUsed:   (swapTotal != null && swapFree != null) ? swapTotal - swapFree : null,
    // Disk (bytes)
    diskTotal,
    diskAvail,
    diskUsed:   (diskTotal != null && diskAvail != null) ? diskTotal - diskAvail : null,
    diskReadRate:  sumAll(diskReadRateData),
    diskWriteRate: sumAll(diskWriteRateData),
    // Network cumulative bytes
    netRecvTotal: pick(netRecvTotalData),
    netSentTotal: pick(netSentTotalData),
    // OS / uname — prefer node_os_info pretty_name, fall back to uname sysname
    osName: lbl(osInfoData, 'pretty_name')
      || (lbl(osInfoData, 'name') && lbl(osInfoData, 'version_id')
           ? `${lbl(osInfoData, 'name')} ${lbl(osInfoData, 'version_id')}`
           : lbl(osInfoData, 'name'))
      || lbl(unameData, 'sysname')
      || '—',
    kernelVersion: lbl(unameData, 'release'),
    architecture:  lbl(unameData, 'machine'),
    nodeName:      lbl(unameData, 'nodename'),
    // Processes
    procsRunning: pick(procsRunData),
    procsBlocked: pick(procsBlockData),
    // Raw cpu_info result — let caller inspect all labels for debugging
    _cpuInfoLabels: cpuResult?.metric || null
  };
}

// Returns live per-CPU-thread usage % array: [{ cpu: '0', usage: 34.2 }, ...]
export async function fetchPerCoreUsage(hostName) {
  try {
    const query = `100 - (rate(node_cpu_seconds_total{mode="idle",host_name="${hostName}"}[1m]) * 100)`;
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }).then(r => r.json()).catch(() => ({ data: { result: [] } }));

    return (res?.data?.result || [])
      .map(r => ({ cpu: r.metric?.cpu ?? '?', usage: parseFloat(r.value?.[1]) || 0 }))
      .sort((a, b) => Number(a.cpu) - Number(b.cpu));
  } catch {
    return [];
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

export async function fetchRealLogs(startTime, endTime, type, search) {
  try {
    let url = `${BACKEND_URL}/logs`;
    const params = [];
    if (startTime) params.push(`startTime=${startTime}`);
    if (endTime) params.push(`endTime=${endTime}`);
    if (type) params.push(`type=${type}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch logs from Backend');
    return await response.json();
  } catch (error) {
    console.error("Backend API Logs Error:", error);
    return [];
  }
}

export async function fetchLatestScans() {
  try {
    const response = await fetch(`${BACKEND_URL}/scans`);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch scans:', err);
    return [];
  }
}

export async function fetchIpInfo(ips) {
  try {
    const response = await fetch(`${BACKEND_URL}/ip-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ips })
    });
    if (!response.ok) throw new Error('Failed to fetch IP info');
    return await response.json(); // { "1.2.3.4": { country, city, isp, ... }, ... }
  } catch (error) {
    console.error("IP Info Error:", error);
    return {};
  }
}
