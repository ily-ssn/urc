import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let checks = 0;
const base = await readFile("tests/database.mjs", "utf8");
const prelude = base.match(/await db.exec\(\s*`([\s\S]*?)`,\s*\);/)[1];
await db.exec(prelude);
await db.exec(await readFile("supabase/SCHEMA.sql", "utf8"));
await db.exec(await readFile("supabase/COMMUNITY.sql", "utf8"));
const ids = {
  owner: "11111111-1111-4111-8111-111111111111",
  editor: "22222222-2222-4222-8222-222222222222",
  checkin: "33333333-3333-4333-8333-333333333333",
  alice: "44444444-4444-4444-8444-444444444444",
  bob: "55555555-5555-4555-8555-555555555555",
  outsider: "66666666-6666-4666-8666-666666666666",
};
for (const [name, id] of Object.entries(ids)) {
  await db.query("INSERT INTO auth.users VALUES($1)", [id]);
  if (["owner", "editor", "checkin"].includes(name))
    await db.query(
      "INSERT INTO public.urc_team(user_id,display_name,role)VALUES($1,$2,$2)",
      [id, name],
    );
}
async function as(name, fn) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
    ids[name] ?? "",
  ]);
  await db.exec(
    "SET ROLE " +
      (name === "anon"
        ? "anon"
        : name === "service"
          ? "service_role"
          : "authenticated"),
  );
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}
async function denied(name, sql, args = []) {
  await assert.rejects(() => as(name, () => db.query(sql, args)));
  checks++;
}
await as("alice", () =>
  db.query(
    "INSERT INTO public.urc_member_profiles(user_id,handle,display_name,bio,public_profile,connections_enabled,news_opt_in)VALUES($1,'alice-runner','Alice','Public biography',true,true,true)",
    [ids.alice],
  ),
);
await as("bob", () =>
  db.query(
    "INSERT INTO public.urc_member_profiles(user_id,handle,display_name,public_profile,connections_enabled)VALUES($1,'bob-runner','Bob',false,true)",
    [ids.bob],
  ),
);
await denied(
  "alice",
  "UPDATE public.urc_member_profiles SET user_id=$1 WHERE user_id=$2",
  [ids.bob, ids.alice],
);
await as("bob", async () => {
  const r = await db.query("SELECT * FROM public.urc_member_profiles");
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].display_name, "Bob");
  checks++;
});
await as("owner", async () => {
  const r = await db.query("SELECT * FROM public.urc_member_profiles");
  assert.equal(r.rows.length, 0);
  checks++;
});
await denied("anon", "SELECT * FROM public.urc_member_profiles");
await as("anon", async () => {
  const r = await db.query("SELECT * FROM public.urc_people()");
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].display_name, "Alice");
  assert.equal("news_opt_in" in r.rows[0], false);
  assert.equal("email" in r.rows[0], false);
  checks++;
});
await as("alice", () =>
  db.query("SELECT public.urc_follow('club','urc',true)"),
);
await as("bob", async () => {
  const r = await db.query("SELECT * FROM public.urc_follows");
  assert.equal(r.rows.length, 0);
  checks++;
});
await denied(
  "bob",
  "INSERT INTO public.urc_follows(follower_id,subject_type,subject_id)VALUES($1,'club','urc')",
  [ids.alice],
);
await denied("anon", "SELECT public.urc_follow('club','urc',true)");
await denied("alice", "SELECT public.urc_follow('member',$1,true)", [ids.bob]);
await denied("alice", "SELECT public.urc_connect($1)", [ids.bob]);
await as("bob", () =>
  db.query(
    "UPDATE public.urc_member_profiles SET public_profile=true WHERE user_id=$1",
    [ids.bob],
  ),
);
await as("alice", () => db.query("SELECT public.urc_connect($1)", [ids.bob]));
let connection;
await as("alice", async () => {
  connection = (await db.query("SELECT * FROM public.urc_connections")).rows[0];
  assert.equal(connection.status, "pending");
  checks++;
});
await denied("alice", "SELECT public.urc_connection_reply($1,'accepted')", [
  connection.id,
]);
await denied("outsider", "SELECT public.urc_connection_reply($1,'accepted')", [
  connection.id,
]);
await as("outsider", async () => {
  assert.equal(
    (await db.query("SELECT * FROM public.urc_connections")).rows.length,
    0,
  );
  checks++;
});
await as("bob", () =>
  db.query("SELECT public.urc_connection_reply($1,'accepted')", [
    connection.id,
  ]),
);
await as("alice", async () => {
  assert.equal(
    (await db.query("SELECT status FROM public.urc_connections")).rows[0]
      .status,
    "accepted",
  );
  checks++;
});
await denied("alice", "SELECT public.urc_ops('summary')");
await denied("anon", "SELECT public.urc_ops('summary')");
await denied("checkin", "SELECT public.urc_ops('history')");
// A SELECT denied by row policy returns no rows rather than raising.
await as("alice", async () => {
  assert.equal(
    (await db.query("SELECT * FROM public.urc_requests")).rows.length,
    0,
  );
  checks++;
});
await as("service", () =>
  db.query(
    "INSERT INTO public.urc_requests(kind,name,email,message)VALUES('contact','Test','test@example.invalid','Please contact me.')",
  ),
);
await as("editor", async () => {
  const r = await db.query("SELECT * FROM public.urc_requests");
  assert.equal(r.rows.length, 1);
  checks++;
});
await as("checkin", async () => {
  assert.equal(
    (await db.query("SELECT * FROM public.urc_requests")).rows.length,
    0,
  );
  checks++;
});
await as("service", async () => {
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await db.query("SELECT public.urc_claim_request($1)", ["a".repeat(64)]))
        .rows[0].urc_claim_request,
      true,
    );
  assert.equal(
    (await db.query("SELECT public.urc_claim_request($1)", ["a".repeat(64)]))
      .rows[0].urc_claim_request,
    false,
  );
  checks++;
});
await denied("alice", "SELECT public.urc_claim_request($1)", ["a".repeat(64)]);
await denied("anon", "SELECT * FROM private.urc_operation_log");
await denied("editor", "SELECT * FROM private.urc_history");

const event = "77777777-7777-4777-8777-777777777777";
const payload = {
  startsAt: "2099-10-31T07:30:00+02:00",
  endsAt: "2099-10-31T12:00:00+02:00",
  location: "Test venue",
  purpose: "Test cause",
  activities: "5 km;Walk",
  activityOptions: "5 km\nWalk",
  registration: "open",
  registrationMode: "free-pass",
  capacity: "3",
  partnerOffer: "Test recovery benefit",
  offerTerms: "One use, after check-in.",
  offerValidUntil: "2099-10-31T12:00:00+02:00",
};
await as("owner", () =>
  db.query(
    "INSERT INTO public.urc_entries(id,kind,title,slug,payload,publish_requested)VALUES($1,'event','Local test run','local-test-run',$2,true)",
    [event, payload],
  ),
);
let passes;
await as("service", async () => {
  const r = await db.query("SELECT public.urc_register_group($1,$2,$3,$4,$5)", [
    event,
    JSON.stringify([
      { name: "Alice", activity: "5 km" },
      { name: "Friend", activity: "Walk" },
    ]),
    JSON.stringify(["1".repeat(64), "2".repeat(64)]),
    "c".repeat(64),
    ids.alice,
  ]);
  passes = r.rows[0].urc_register_group;
  assert.equal(passes.length, 2);
  checks++;
});
await as("alice", async () => {
  assert.equal(
    (await db.query("SELECT public.urc_member_passes()")).rows[0]
      .urc_member_passes.length,
    2,
  );
  checks++;
});
await as("bob", async () => {
  assert.equal(
    (await db.query("SELECT public.urc_member_passes()")).rows[0]
      .urc_member_passes.length,
    0,
  );
  checks++;
});
await denied("service", "SELECT public.urc_register_group($1,$2,$3,$4,NULL)", [
  event,
  JSON.stringify([
    { name: "Third", activity: "Walk" },
    { name: "Fourth", activity: "Walk" },
  ]),
  JSON.stringify(["3".repeat(64), "4".repeat(64)]),
  "d".repeat(64),
]);
assert.equal(
  (await db.query("SELECT count(*)::integer n FROM private.urc_registrations"))
    .rows[0].n,
  2,
);
checks++;
await denied(
  "service",
  "SELECT public.urc_register_free_pass($1,$2,$3,$4,$5,$6,$7)",
  [event, "Wrong activity", "100 km", "", "", "5".repeat(64), "e".repeat(64)],
);
await as("checkin", async () => {
  const result = (
    await db.query("SELECT public.urc_ops('participants',$1)", [event])
  ).rows[0].urc_ops;
  assert.equal(result.length, 2);
  assert.equal(result[0].email, null);
  checks++;
});
await as("editor", () =>
  db.query("SELECT public.urc_check_in($1)", [passes[1].passCode]),
);
let redeemed;
await as("checkin", async () => {
  const initial = (
    await db.query("SELECT public.urc_benefit($1,false)", [passes[1].passCode])
  ).rows[0].urc_benefit;
  assert.equal(initial.redeemedAt, null);
  const result = (
    await db.query("SELECT public.urc_benefit($1,true)", [passes[1].passCode])
  ).rows[0].urc_benefit;
  redeemed = result.redeemedAt;
  assert.ok(redeemed);
  assert.equal(
    (await db.query("SELECT public.urc_benefit($1,true)", [passes[1].passCode]))
      .rows[0].urc_benefit.redeemedAt,
    redeemed,
  );
  checks++;
});
await denied("alice", "SELECT public.urc_benefit($1,true)", [
  passes[1].passCode,
]);
await denied("checkin", "SELECT public.urc_ops('undo-checkin',$1,$2)", [
  passes[1].id,
  JSON.stringify({ reason: "A participant was scanned by mistake." }),
]);
await denied("editor", "SELECT public.urc_ops('undo-checkin',$1,$2)", [
  passes[1].id,
  JSON.stringify({ reason: "short" }),
]);
await as("editor", () =>
  db.query("SELECT public.urc_ops('undo-checkin',$1,$2)", [
    passes[1].id,
    JSON.stringify({
      reason: "This participant was scanned against the wrong pass.",
    }),
  ]),
);
assert.equal(
  (await db.query("SELECT count(*)::integer n FROM private.urc_operation_log"))
    .rows[0].n,
  1,
);
checks++;
await as("owner", async () => {
  const result = (await db.query("SELECT public.urc_ops('summary')")).rows[0]
    .urc_ops;
  assert.equal(result.registrations, 2);
  assert.equal(result.checkins, 0);
  checks++;
});
await as("service", async () => {
  assert.equal(
    (
      await db.query("SELECT public.urc_replace_member_pass($1,$2,$3)", [
        passes[1].id,
        ids.bob,
        "7".repeat(64),
      ])
    ).rows[0].urc_replace_member_pass,
    false,
  );
  assert.equal(
    (
      await db.query("SELECT public.urc_replace_member_pass($1,$2,$3)", [
        passes[1].id,
        ids.alice,
        "7".repeat(64),
      ])
    ).rows[0].urc_replace_member_pass,
    true,
  );
  assert.equal(
    (await db.query("SELECT public.urc_get_pass($1)", ["2".repeat(64)])).rows[0]
      .urc_get_pass,
    null,
  );
  checks++;
});
await denied("alice", "SELECT public.urc_replace_member_pass($1,$2,$3)", [
  passes[1].id,
  ids.alice,
  "8".repeat(64),
]);
await as("service", async () => {
  assert.equal(
    (await db.query("SELECT public.urc_cancel_pass($1)", ["1".repeat(64)]))
      .rows[0].urc_cancel_pass,
    true,
  );
  checks++;
});
await denied("anon", "SELECT public.urc_member_passes()");
await as("anon", async () => {
  const stats = (await db.query("SELECT public.urc_public_stats()")).rows[0]
    .urc_public_stats;
  assert.equal(stats.followers, 1);
  assert.equal(Object.keys(stats).length, 1);
  checks++;
});
await denied("alice", "SELECT public.urc_claim_ai($1)", [ids.owner]);
await as("service", async () => {
  assert.equal(
    (await db.query("SELECT public.urc_claim_ai($1)", [ids.alice])).rows[0]
      .urc_claim_ai,
    false,
  );
  for (let i = 0; i < 20; i++)
    assert.equal(
      (await db.query("SELECT public.urc_claim_ai($1)", [ids.owner])).rows[0]
        .urc_claim_ai,
      true,
    );
  assert.equal(
    (await db.query("SELECT public.urc_claim_ai($1)", [ids.owner])).rows[0]
      .urc_claim_ai,
    false,
  );
  checks++;
});
console.log(`PASS ${checks} community database permission and privacy checks.`);
await db.close();
