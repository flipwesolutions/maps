/**
 * Cache layer — Redis when REDIS_HOST is set, in-memory fallback otherwise.
 */

const memory = new Map();
const DEFAULT_TTL_S = 300;

let redisClient = null;
let redisInitAttempted = false;

async function getRedis() {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  const host = process.env.REDIS_HOST;
  if (!host) return null;

  try {
    const { createClient } = await import("redis");
    const port = Number(process.env.REDIS_PORT ?? 6379);
    const client = createClient({ url: `redis://${host}:${port}` });
    client.on("error", (err) => console.warn("Redis:", err.message));
    await client.connect();
    redisClient = client;
    console.log(`Redis cache connected @ ${host}:${port}`);
  } catch (err) {
    console.warn("Redis unavailable, using in-memory cache:", err.message);
  }
  return redisClient;
}

function memGet(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key, value, ttlS) {
  memory.set(key, { value, expires: Date.now() + ttlS * 1000 });
  if (memory.size > 10_000) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
}

/**
 * @param {string} key
 * @param {() => Promise<T>} fetcher
 * @param {number} ttlS
 * @returns {Promise<T>}
 * @template T
 */
export async function cached(key, fetcher, ttlS = DEFAULT_TTL_S) {
  const redis = await getRedis();

  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit);
    } catch {
      /* fall through */
    }
  } else {
    const hit = memGet(key);
    if (hit) return JSON.parse(hit);
  }

  const value = await fetcher();
  const serialized = JSON.stringify(value);

  if (redis) {
    try {
      await redis.setEx(key, ttlS, serialized);
    } catch {
      memSet(key, serialized, ttlS);
    }
  } else {
    memSet(key, serialized, ttlS);
  }

  return value;
}

export function cacheKey(prefix, parts) {
  return `${prefix}:${parts.filter(Boolean).join(":")}`;
}
