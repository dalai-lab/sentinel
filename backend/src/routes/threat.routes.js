const express = require('express');
const router = express.Router();
const { lookupThreat } = require('../services/threatIntel.service');

// Simple in-memory cache: sig -> { data, expiry }
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/threat/lookup?sig=Win.Trojan.Dridex-12345
 * Returns threat intelligence for a ClamAV signature name.
 */
router.get('/lookup', async (req, res) => {
  const sig = (req.query.sig || '').trim();
  if (!sig) return res.status(400).json({ error: 'sig query param is required' });

  // Check cache
  const cached = cache.get(sig);
  if (cached && Date.now() < cached.expiry) {
    return res.json({ ...cached.data, cached: true });
  }

  try {
    const data = await lookupThreat(sig);
    cache.set(sig, { data, expiry: Date.now() + CACHE_TTL });
    return res.json(data);
  } catch (err) {
    console.error('[THREAT ROUTE] Lookup failed:', err.message);
    return res.status(500).json({ error: 'Threat lookup failed', message: err.message });
  }
});

/**
 * POST /api/threat/batch
 * Body: { signatures: ["Win.Trojan.X", "Unix.Backdoor.Y"] }
 * Looks up multiple threats at once.
 */
router.post('/batch', async (req, res) => {
  const sigs = Array.isArray(req.body?.signatures) ? req.body.signatures.slice(0, 10) : [];
  if (!sigs.length) return res.status(400).json({ error: 'signatures array is required' });

  const results = await Promise.all(
    sigs.map(async (sig) => {
      const cached = cache.get(sig);
      if (cached && Date.now() < cached.expiry) return { sig, ...cached.data, cached: true };
      const data = await lookupThreat(sig);
      cache.set(sig, { data, expiry: Date.now() + CACHE_TTL });
      return { sig, ...data };
    })
  );

  return res.json(results);
});

module.exports = router;
