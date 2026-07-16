const axios = require('axios');
const config = require('../config/env');

const VT_BASE = 'https://www.virustotal.com/api/v3';

// ──────────────────────────────────────────────────────────────────────────────
// Offline signature name parser
// ClamAV signatures follow the pattern: Platform.Category.Family[-variant]
// Examples: Win.Trojan.Dridex-12345, Unix.Ransomware.Erebus, Multi.Exploit.CVE...
// ──────────────────────────────────────────────────────────────────────────────
function parseClamavSignature(sig) {
  if (!sig) return null;

  const PLATFORM_MAP = {
    'Win':   'Windows',
    'Unix':  'Linux/Unix',
    'Osx':   'macOS',
    'Android': 'Android',
    'PHP':   'PHP/Web',
    'HTML':  'HTML/Web',
    'JS':    'JavaScript',
    'Python':'Python',
    'Multi': 'Cross-Platform',
    'Email': 'Email',
    'Doc':   'Document',
    'Pdf':   'PDF',
  };

  const CATEGORY_MAP = {
    'Trojan':      { label: 'Trojan',        severity: 'high',     color: '#f97316', icon: '🐴' },
    'Ransomware':  { label: 'Ransomware',     severity: 'critical', color: '#ef4444', icon: '💀' },
    'Backdoor':    { label: 'Backdoor',       severity: 'critical', color: '#ef4444', icon: '🚪' },
    'Exploit':     { label: 'Exploit',        severity: 'critical', color: '#dc2626', icon: '💣' },
    'Worm':        { label: 'Worm',           severity: 'high',     color: '#f97316', icon: '🪱' },
    'Rootkit':     { label: 'Rootkit',        severity: 'critical', color: '#ef4444', icon: '🔑' },
    'Spyware':     { label: 'Spyware',        severity: 'high',     color: '#f97316', icon: '👁️' },
    'Adware':      { label: 'Adware',         severity: 'medium',   color: '#eab308', icon: '📢' },
    'PUA':         { label: 'Potentially Unwanted', severity: 'low', color: '#84cc16', icon: '⚠️' },
    'PUP':         { label: 'Potentially Unwanted', severity: 'low', color: '#84cc16', icon: '⚠️' },
    'Downloader':  { label: 'Downloader',     severity: 'high',     color: '#f97316', icon: '⬇️' },
    'Webshell':    { label: 'Web Shell',      severity: 'critical', color: '#ef4444', icon: '🌐' },
    'Miner':       { label: 'Cryptominer',    severity: 'medium',   color: '#eab308', icon: '⛏️' },
    'Bot':         { label: 'Botnet',         severity: 'high',     color: '#f97316', icon: '🤖' },
    'Virus':       { label: 'Virus',          severity: 'high',     color: '#f97316', icon: '🦠' },
    'Keylogger':   { label: 'Keylogger',      severity: 'critical', color: '#ef4444', icon: '⌨️' },
    'Agent':       { label: 'Malware Agent',  severity: 'high',     color: '#f97316', icon: '🕵️' },
    'Generic':     { label: 'Generic Malware',severity: 'medium',   color: '#eab308', icon: '⚠️' },
    'Eicar':       { label: 'Test File',      severity: 'info',     color: '#60a5fa', icon: '🧪' },
  };

  // Strip trailing hash (e.g. "-12345" or ".12345")
  const cleanSig = sig.replace(/[-.](\d{4,})$/, '');
  const parts = cleanSig.split('.');

  let platform = 'Unknown';
  let categoryInfo = { label: 'Unknown', severity: 'medium', color: '#eab308', icon: '⚠️' };
  let family = cleanSig;

  // Try to detect platform from first segment
  if (parts.length >= 2 && PLATFORM_MAP[parts[0]]) {
    platform = PLATFORM_MAP[parts[0]];
  }

  // Try to detect category
  for (const part of parts) {
    if (CATEGORY_MAP[part]) {
      categoryInfo = CATEGORY_MAP[part];
      // Family = part after category
      const catIndex = parts.indexOf(part);
      if (catIndex < parts.length - 1) {
        family = parts.slice(catIndex + 1).join('.');
      }
      break;
    }
  }

  // Special: if starts with Eicar it's a test file
  if (sig.toLowerCase().includes('eicar')) {
    categoryInfo = CATEGORY_MAP['Eicar'];
    family = 'EICAR Test';
    platform = 'Test';
  }

  return { platform, categoryInfo, family, cleanSig };
}

// ──────────────────────────────────────────────────────────────────────────────
// VirusTotal lookup — searches for the ClamAV signature to find real samples
// ──────────────────────────────────────────────────────────────────────────────
async function lookupVirusTotal(sig) {
  if (!config.VIRUSTOTAL_API_KEY) return null;

  try {
    // Search VirusTotal for files matching this ClamAV signature
    const searchRes = await axios.get(`${VT_BASE}/search`, {
      params: { query: `clamav:${sig} positives:1+`, limit: 5 },
      headers: { 'x-apikey': config.VIRUSTOTAL_API_KEY },
      timeout: 8000
    });

    const items = searchRes.data?.data || [];
    if (!items.length) {
      // Try broader search without clamav: prefix
      const fallbackRes = await axios.get(`${VT_BASE}/search`, {
        params: { query: sig, limit: 3 },
        headers: { 'x-apikey': config.VIRUSTOTAL_API_KEY },
        timeout: 8000
      });
      items.push(...(fallbackRes.data?.data || []));
    }

    if (!items.length) return null;

    // Aggregate stats from top results
    let totalMalicious = 0, totalEngines = 0;
    const allTags = new Set();
    let topName = null;
    let topHash = null;

    for (const item of items.slice(0, 3)) {
      const attrs = item.attributes || {};
      const stats = attrs.last_analysis_stats || {};
      totalMalicious += stats.malicious || 0;
      totalEngines   += (stats.malicious || 0) + (stats.undetected || 0) + (stats.suspicious || 0);
      (attrs.tags || []).forEach(t => allTags.add(t));
      if (!topName) topName = attrs.meaningful_name || attrs.name;
      if (!topHash) topHash = item.id;
    }

    const avgMalicious = items.length ? Math.round(totalMalicious / items.length) : 0;
    const avgTotal     = items.length ? Math.round(totalEngines   / items.length) : 0;

    return {
      detectionCount: avgMalicious,
      totalEngines: avgTotal,
      tags: [...allTags].slice(0, 8),
      topHash,
      topName,
      vtLink: topHash ? `https://www.virustotal.com/gui/file/${topHash}` : `https://www.virustotal.com/gui/search/${encodeURIComponent(sig)}`
    };
  } catch (err) {
    console.error('[THREAT INTEL] VT lookup failed:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main exported function — combines offline parsing + VT live data
// ──────────────────────────────────────────────────────────────────────────────
async function lookupThreat(sig) {
  if (!sig) return { error: 'No signature provided' };

  const offline = parseClamavSignature(sig);
  const vtData  = await lookupVirusTotal(sig);

  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

  // If VT found many detections, upgrade severity
  let finalSeverity = offline.categoryInfo.severity;
  if (vtData?.detectionCount >= 50) finalSeverity = 'critical';
  else if (vtData?.detectionCount >= 20) finalSeverity = ['critical','high'].includes(finalSeverity) ? finalSeverity : 'high';

  return {
    threatName: sig,
    cleanName: offline.cleanSig,
    platform: offline.platform,
    category: offline.categoryInfo.label,
    categoryIcon: offline.categoryInfo.icon,
    categoryColor: offline.categoryInfo.color,
    family: offline.family,
    severity: finalSeverity,
    // VT live data (null if no API key or no results)
    detectionCount: vtData?.detectionCount ?? null,
    totalEngines: vtData?.totalEngines ?? null,
    detectionRate: (vtData?.detectionCount != null && vtData?.totalEngines > 0)
      ? Math.round((vtData.detectionCount / vtData.totalEngines) * 100)
      : null,
    tags: vtData?.tags ?? [],
    vtLink: vtData?.vtLink ?? `https://www.virustotal.com/gui/search/${encodeURIComponent(sig)}`,
    sourceMode: vtData ? 'live' : 'offline'
  };
}

module.exports = { lookupThreat };
