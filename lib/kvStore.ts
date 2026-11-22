import fs from "fs";
import path from "path";

function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  return null;
}

function localPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  const base = process.env.VERCEL
    ? "/tmp/sahabat-nalar-pai"
    : path.join(process.cwd(), "data");
  return path.join(base, `${safe}.json`);
}

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const cfg = getRedisConfig();
  if (cfg) {
    try {
      const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { result?: string | null };
        if (typeof data.result === "string" && data.result.length > 0) {
          return JSON.parse(data.result) as T;
        }
      }
    } catch (e) {
      console.error("[kvStore] Redis GET error:", e);
    }
    return fallback;
  }

  try {
    const p = localPath(key);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw) as T;
    }
  } catch {}
  return fallback;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  const cfg = getRedisConfig();
  if (cfg) {
    try {
      await fetch(cfg.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", key, serialized]),
        cache: "no-store",
      });
      return;
    } catch (e) {
      console.error("[kvStore] Redis SET error:", e);
    }
  }

  try {
    const p = localPath(key);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, serialized, "utf-8");
  } catch (e) {
    console.error("[kvStore] Local write error:", e);
  }
}
