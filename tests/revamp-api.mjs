import assert from "node:assert/strict";
import community from "../api/community.js";
import assistant from "../api/assistant.js";
import page from "../api/page.js";
import { browserConfig, serviceBackend } from "../lib/backend.js";
import {
  calendarFile,
  safeUrl,
  escapeHtml,
  eventState,
  estimatedMinutes,
} from "../lib/public.js";
assert.equal(estimatedMinutes(5, 7), 35);
assert.equal(estimatedMinutes(10, 6.5), 65);
assert.equal(estimatedMinutes(-1, 7), null);
assert.equal(estimatedMinutes(5, "invalid"), null);
import { pageHtml } from "../scripts/pages.mjs";
const keys = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "URC_AI_ENABLED",
  "URC_AI_MODEL",
  "AI_GATEWAY_API_KEY",
];
const saved = new Map(keys.map((k) => [k, process.env[k]]));
for (const k of keys) delete process.env[k];
const originalFetch = globalThis.fetch;
function response() {
  return {
    code: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.code = c;
      return this;
    },
    json(d) {
      this.data = d;
      return this;
    },
    end(d) {
      this.raw = d;
      return this;
    },
  };
}
async function call(handler, body = {}, extra = {}) {
  const res = response();
  await handler(
    {
      method: "POST",
      headers: { host: "urc.test", origin: "https://urc.test" },
      body,
      ...extra,
    },
    res,
  );
  return res;
}
try {
  for (const h of [community, assistant]) {
    assert.equal((await call(h, {}, { method: "GET" })).code, 405);
    assert.equal(
      (
        await call(
          h,
          {},
          { headers: { host: "urc.test", origin: "https://foreign.invalid" } },
        )
      ).code,
      403,
    );
  }
  assert.deepEqual((await call(community, { action: "people" })).data, {
    configured: false,
    people: [],
  });
  assert.deepEqual((await call(community, { action: "stats" })).data, {
    configured: false,
    stats: null,
  });
  assert.equal(
    (
      await call(community, {
        action: "request",
        type: "contact",
        name: "Name",
        email: "person@example.invalid",
        message: "Hello organisers.",
      })
    ).code,
    503,
  );
  for (const body of [
    [],
    { action: "request", type: "contact", name: "N", email: "x", message: "x" },
    {
      action: "request",
      type: "contact",
      name: "N",
      email: "p@example.invalid",
      message: "x",
      website: "spam",
    },
  ])
    assert.equal((await call(community, body)).code, 400);
  assert.equal(
    (await call(assistant, { task: "event", notes: "a".repeat(50) })).code,
    401,
  );
  process.env.SUPABASE_URL = "https://hcfh-example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fake";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "private-service-fixture";
  assert.equal(browserConfig(), null);
  assert.equal(serviceBackend(), null);
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const event = {
    id: "test",
    slug: "test-run",
    title: "Run\r\nATTENDEE:injection",
    payload: {
      startsAt: "2099-10-31T07:30:00+02:00",
      location: "Harare",
      purpose: "Community run",
    },
  };
  const calendar = calendarFile(event, "https://urc.test");
  assert.ok(calendar.includes("DTSTART:20991031T053000Z"));
  assert.ok(!calendar.includes("\r\nATTENDEE:"));
  assert.ok(calendar.includes("SUMMARY:Run\\nATTENDEE:injection"));
  assert.equal(
    eventState({
      payload: { startsAt: "2099-10-31", eventStatus: "cancelled" },
    }),
    "cancelled",
  );
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("//evil.invalid"), "");
  assert.equal(safeUrl("https://user:password@evil.invalid"), "");
  assert.equal(safeUrl("/assets/reset.jpg"), "/assets/reset.jpg");
  assert.equal(escapeHtml('<script>"'), "&lt;script&gt;&quot;");
  const html = pageHtml("events", {
    title: "<img src=x onerror=alert(1)>",
    description: '"/><script>unsafe</script>',
  });
  assert.ok(!html.includes("<script>unsafe"));
  assert.ok(html.includes("&lt;img"));
  let r = await call(
    page,
    {},
    { method: "GET", query: { section: "events", slug: "reset" } },
  );
  assert.equal(r.code, 200);
  assert.ok(r.raw.includes("<title>RESET · URC</title>"));
  assert.ok(
    r.raw.includes("https://powerhouse-urc.vercel.app/assets/reset.jpg"),
  );
  assert.ok(r.raw.includes('data-page="events"'));
  r = await call(
    page,
    {},
    {
      method: "GET",
      query: { section: "events", slug: "unknown-private-draft" },
    },
  );
  assert.equal(r.code, 404);
  r = await call(
    page,
    {},
    { method: "GET", query: { section: "__proto__", slug: "reset" } },
  );
  assert.equal(r.code, 404);
  // Verified membership alone cannot use the team assistant. No inference calls occur.
  process.env.SUPABASE_URL = "https://ktfwfeuyrpvelvpdborw.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fake";
  let role = "member",
    calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input.url ?? input);
    calls.push(url);
    if (url.endsWith("/auth/v1/user"))
      return Response.json({
        id: "11111111-1111-4111-8111-111111111111",
        email: "fixture@example.invalid",
      });
    if (url.includes("/rest/v1/urc_team")) return Response.json({ role });
    throw Error("Unexpected external request");
  };
  const request = {
    headers: {
      host: "urc.test",
      origin: "https://urc.test",
      authorization: "Bearer " + "t".repeat(40),
    },
  };
  assert.equal(
    (await call(assistant, { action: "status" }, request)).code,
    403,
  );
  role = "owner";
  r = await call(assistant, { action: "status" }, request);
  assert.equal(r.code, 200);
  assert.equal(r.data.enabled, false);
  assert.ok(calls.every((url) => url.startsWith(process.env.SUPABASE_URL)));
  assert.equal(
    (
      await call(
        assistant,
        { task: "event", notes: "Confirmed notes for a run in Harare." },
        request,
      )
    ).code,
    503,
  );
  console.log(
    "PASS: URC project binding, community forms, assistant role gates, safe links, calendar escaping and server-rendered event metadata. No provider calls.",
  );
} finally {
  globalThis.fetch = originalFetch;
  for (const [k, v] of saved)
    v === undefined ? delete process.env[k] : (process.env[k] = v);
}
