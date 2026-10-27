import { createClient } from "@supabase/supabase-js";
const URC_HOST = "ktfwfeuyrpvelvpdborw.supabase.co";
function urcUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname === URC_HOST
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
export function browserConfig() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (!urcUrl(url)) return null;
    const publishable = key.startsWith("sb_publishable_");
    const legacyAnon =
      !publishable &&
      JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString())
        .role === "anon";
    if (!publishable && !legacyAnon) return null;
    return { url: parsed.origin, publishableKey: key };
  } catch {
    return null;
  }
}
export function publicBackend() {
  const config = browserConfig();
  return config
    ? createClient(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}
export function serviceBackend() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !urcUrl(url)) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function verifiedMember(req) {
  const value = req.headers.authorization;
  if (!value) return null;
  if (
    typeof value !== "string" ||
    !/^Bearer [A-Za-z0-9_.-]{20,12000}$/.test(value)
  )
    throw Error("Sign in again.");
  const db = publicBackend();
  if (!db) throw Error("Account access is not connected.");
  const { data, error } = await db.auth.getUser(value.slice(7));
  if (error || !data.user) throw Error("Sign in again.");
  return data.user;
}
export function authenticatedBackend(req) {
  const config = browserConfig();
  if (!config || typeof req.headers.authorization !== "string") return null;
  return createClient(config.url, config.publishableKey, {
    global: { headers: { Authorization: req.headers.authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
export function privateResponse(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
}
