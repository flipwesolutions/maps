import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (pool) return pool;

  const host = process.env.POSTGIS_HOST;
  if (!host) return null;

  pool = new Pool({
    host,
    port: Number(process.env.POSTGIS_PORT ?? 5432),
    database: process.env.POSTGIS_DATABASE ?? "flipwi_maps",
    user: process.env.POSTGIS_USER ?? "flipwi",
    password: process.env.POSTGIS_PASSWORD ?? "flipwi",
    max: Number(process.env.POSTGIS_POOL_MAX ?? 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (err) => {
    console.error("PostGIS pool error:", err.message);
  });

  return pool;
}

export async function query(text, params = []) {
  const p = getPool();
  if (!p) return null;
  return p.query(text, params);
}

export async function isDatabaseReady() {
  try {
    const result = await query("SELECT 1 AS ok");
    return result?.rows?.[0]?.ok === 1;
  } catch {
    return false;
  }
}
