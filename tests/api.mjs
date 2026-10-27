import assert from "node:assert/strict";
import config from "../api/studio/config.js";
import register from "../api/register.js";
import pass from "../api/pass.js";
import invite from "../api/studio/invite.js";
import content from "../api/content.js";
const saved = { ...process.env };
for (const key of [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
])
  delete process.env[key];
function response() {
  return {
    code: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
}
async function call(handler, options = {}) {
  const res = response();
  await handler(
    { method: "GET", headers: { host: "urc.test" }, ...options },
    res,
  );
  return res;
}
try {
  let res = await call(config);
  assert.deepEqual(res.data, { configured: false });
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_secret_DO_NOT_EXPOSE";
  res = await call(config);
  assert.deepEqual(res.data, { configured: false });
  process.env.SUPABASE_PUBLISHABLE_KEY =
    "test." +
    Buffer.from(JSON.stringify({ role: "service_role" })).toString(
      "base64url",
    ) +
    ".test";
  res = await call(config);
  assert.deepEqual(res.data, { configured: false });
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_URL;
  res = await call(content);
  assert.deepEqual(res.data, { configured: false, entries: [] });
  for (const handler of [register, pass, invite]) {
    res = await call(handler);
    assert.equal(res.code, 405);
    res = await call(handler, {
      method: "POST",
      headers: { host: "urc.test", origin: "https://other.test" },
      body: {},
    });
    assert.equal(res.code, 403);
    assert.equal(res.headers["Cache-Control"], "no-store");
  }
  res = await call(register, {
    method: "POST",
    headers: { host: "urc.test", origin: "https://urc.test" },
    body: {},
  });
  assert.equal(res.code, 503);
  res = await call(pass, {
    method: "POST",
    headers: { host: "urc.test", origin: "https://urc.test" },
    body: { token: "invalid" },
  });
  assert.equal(res.code, 404);
  res = await call(invite, {
    method: "POST",
    headers: { host: "urc.test", origin: "https://urc.test" },
    body: {},
  });
  assert.equal(res.code, 503);
  console.log(
    "PASS: API checks reject unsafe browser keys, cross-site writes and unavailable backend operations without exposing credentials.",
  );
} finally {
  for (const key of Object.keys(process.env))
    if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
}
