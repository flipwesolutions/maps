/** @typedef {{ id: string; name: string; subtitle: string; coordinates: [number, number]; type?: string }} SearchPlace */

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireApiKey(req, res, next) {
  const keys = (process.env.CLIENT_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return next();
  }

  const provided = String(
    req.headers["x-api-key"] ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ??
      req.query.api_key ??
      req.query.apiKey ??
      ""
  ).trim();

  if (!provided || !keys.includes(provided)) {
    return res.status(401).json({
      error: "Invalid or missing API key",
      hint: "Send header X-API-Key or query ?api_key=... (must match CLIENT_API_KEYS)",
    });
  }

  next();
}

const buckets = new Map();

/**
 * Simple in-memory rate limit per API key.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function rateLimit(req, res, next) {
  const limit = Number(process.env.RATE_LIMIT_PER_MIN ?? 120);
  const key =
    req.headers["x-api-key"] ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ??
    req.ip;

  const now = Date.now();
  const windowMs = 60_000;
  const entry = buckets.get(key) ?? { count: 0, reset: now + windowMs };

  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }

  entry.count += 1;
  buckets.set(key, entry);

  if (entry.count > limit) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  next();
}
