const axios = require('axios');

// In-memory cache so we never re-fetch the same IP
const cache = {};

/**
 * Batch-lookup geolocation for an array of IPs.
 * Uses ip-api.com free batch endpoint (up to 100 IPs per call, no API key needed).
 * Returns a map of { ip -> geoInfo }
 */
async function lookupIps(ips) {
  const result = {};
  const toFetch = [...new Set(ips)].filter(ip => ip && ip !== '—' && ip !== 'internal');

  // Serve from cache where possible
  const uncached = toFetch.filter(ip => !cache[ip]);
  toFetch.forEach(ip => { if (cache[ip]) result[ip] = cache[ip]; });

  if (uncached.length === 0) return result;

  try {
    // ip-api.com batch endpoint — free, up to 100 IPs per request
    const payload = uncached.map(ip => ({ query: ip, fields: 'status,country,countryCode,regionName,city,isp,org,query' }));
    const res = await axios.post('http://ip-api.com/batch', payload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });

    for (const entry of res.data) {
      if (entry.status === 'success') {
        const geo = {
          country: entry.country || '',
          countryCode: (entry.countryCode || '').toLowerCase(),
          city: entry.city || '',
          region: entry.regionName || '',
          isp: entry.isp || entry.org || '',
        };
        cache[entry.query] = geo;
        result[entry.query] = geo;
      } else {
        // Private / reserved IPs
        const geo = { country: 'Private Network', countryCode: '', city: '', region: '', isp: '' };
        cache[entry.query] = geo;
        result[entry.query] = geo;
      }
    }
  } catch (err) {
    console.error('[IP GEO] Batch lookup failed:', err.message);
  }

  return result;
}

module.exports = { lookupIps };
