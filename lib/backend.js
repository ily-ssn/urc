import { createClient } from "@supabase/supabase-js";
export function browserConfig() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      return null;
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
  if (!url || !key) return null;
  return createClient(url, key, {
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
