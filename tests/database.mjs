import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let checks = 0;
await db.exec(
  `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;GRANT SELECT,INSERT,DELETE ON storage.objects TO anon,authenticated;CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;`,
);
await db.exec(await readFile("supabase/SCHEMA.sql", "utf8"));
console.log("PASS: proposed schema executes");
checks++;
const ids = {
  owner: "11111111-1111-4111-8111-111111111111",
  editor: "22222222-2222-4222-8222-222222222222",
  checkin: "33333333-3333-4333-8333-333333333333",
  outsider: "44444444-4444-4444-8444-444444444444",
  event: "55555555-5555-4555-8555-555555555555",
};
for (const [role, id] of Object.entries(ids).filter(
  ([key]) => key !== "event",
)) {
  await db.query("INSERT INTO auth.users VALUES($1)", [id]);
  if (role !== "outsider")
    await db.query(
      "INSERT INTO public.urc_team(user_id,display_name,role) VALUES($1,$2,$2)",
      [id, role],
    );
}
async function as(role, fn) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
    ids[role] ?? "",
  ]);
  await db.exec(
    "SET ROLE " +
      (role === "anon"
        ? "anon"
        : role === "service"
          ? "service_role"
          : "authenticated"),
  );
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}
async function deny(role, sql, params = []) {
  await as(role, async () => {
    await assert.rejects(() => db.query(sql, params));
  });
  checks++;
}
const payload = {
  startsAt: "2099-10-01T06:00:00+02:00",
  location: "Test meeting point",
  activities: "Walk or run",
  purpose: "Test community cause",
  registration: "open",
  registrationMode: "free-pass",
  capacity: "5",
  photos: [{ path: ids.owner + "/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp" }],
  coverPath: ids.owner + "/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp",
};
await as("owner", () =>
  db.query(
    `INSERT INTO public.urc_entries(id,kind,title,slug,payload,publish_requested) VALUES($1,'event','Test run','test-run',$2,true)`,
    [ids.event, payload],
  ),
);
await as("anon", async () => {
  const r = await db.query("SELECT published_snapshot FROM public.urc_entries");
  assert.equal(r.rows[0].published_snapshot.title, "Test run");
});
checks++;
await deny("anon", "SELECT payload FROM public.urc_entries");
await deny(
  "outsider",
  "INSERT INTO public.urc_entries(kind,title,slug) VALUES('page','Unsafe','unsafe')",
);
await deny(
  "editor",
  "UPDATE public.urc_team SET role='owner' WHERE user_id=$1",
  [ids.editor],
);
await as("owner", () =>
  db.query(
    "UPDATE public.urc_entries SET title=$1,payload=$2,revision=2 WHERE id=$3",
    [
      "Private draft title",
      {
        ...payload,
        purpose: "Private draft cause",
        coverPath: ids.owner + "/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp",
      },
      ids.event,
    ],
  ),
);
await as("anon", async () => {
  const r = await db.query("SELECT published_snapshot FROM public.urc_entries");
  assert.equal(r.rows[0].published_snapshot.title, "Test run");
  assert.equal(
    r.rows[0].published_snapshot.payload.purpose,
    "Test community cause",
  );
});
checks++;
await deny(
  "owner",
  "UPDATE public.urc_entries SET title=$1,revision=2 WHERE id=$2",
  ["Stale save", ids.event],
);
await db.query(
  "INSERT INTO storage.objects(bucket_id,name) VALUES('urc-media',$1),('urc-media',$2)",
  [payload.coverPath, ids.owner + "/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp"],
);
await as("anon", async () => {
  const r = await db.query("SELECT name FROM storage.objects");
  assert.deepEqual(
    r.rows.map((x) => x.name),
    [payload.coverPath],
  );
});
checks++;
await deny("outsider", "SELECT public.urc_check_in($1)", ["DEADBEEF00"]);
await deny(
  "anon",
  "SELECT public.urc_register_free_pass($1,$2,$3,$4,$5,$6,$7)",
  [
    ids.event,
    "Test Participant",
    "Walk",
    "",
    "",
    "a".repeat(64),
    "b".repeat(64),
  ],
);
const register = (token, rate = "b") =>
  as("service", () =>
    db.query(
      "SELECT public.urc_register_free_pass($1,$2,$3,$4,$5,$6,$7) AS pass",
      [
        ids.event,
        "Test Participant",
        "Walk",
        "",
        "",
        token.repeat(64),
        rate.repeat(64),
      ],
    ),
  );
const reg = await register("a");
const code = reg.rows[0].pass.passCode;
checks++;
await as("service", async () => {
  const r = await db.query("SELECT public.urc_get_pass($1) AS pass", [
    "a".repeat(64),
  ]);
  assert.equal(r.rows[0].pass.name, "Test Participant");
  assert.ok(!JSON.stringify(r.rows[0]).includes("donation"));
  assert.ok(!Object.hasOwn(r.rows[0].pass, "email"));
});
checks++;
await as("checkin", async () => {
  let r = await db.query("SELECT public.urc_check_in($1) AS result", [code]);
  assert.equal(r.rows[0].result.alreadyUsed, false);
  r = await db.query("SELECT public.urc_check_in($1) AS result", [code]);
  assert.equal(r.rows[0].result.alreadyUsed, true);
});
checks++;
await register("c");
await register("d");
await assert.rejects(() => register("e"), /Too many/);
checks++;
await deny(
  "outsider",
  "SELECT public.urc_record_donation($1,500,'USD','cash','')",
  [ids.event],
);
await deny(
  "checkin",
  "SELECT public.urc_record_donation($1,500,'USD','cash','')",
  [ids.event],
);
await deny(
  "editor",
  "SELECT public.urc_record_donation($1,500,'USD','online','fake')",
  [ids.event],
);
let donation;
await as("editor", async () => {
  const r = await db.query(
    "SELECT public.urc_record_donation($1,500,'USD','ecocash','TEST-REF') AS id",
    [ids.event],
  );
  donation = r.rows[0].id;
  const ledger = await db.query("SELECT * FROM public.urc_donations");
  assert.equal(ledger.rows[0].status, "pending");
});
checks++;
await deny("editor", "SELECT public.urc_confirm_ecocash($1)", [donation]);
await deny("outsider", "SELECT public.urc_confirm_ecocash($1)", [donation]);
await deny("anon", "SELECT * FROM public.urc_donations");
await as("checkin", async () => {
  const r = await db.query("SELECT * FROM public.urc_donations");
  assert.equal(r.rows.length, 0);
});
checks++;
await as("owner", async () => {
  await db.query("SELECT public.urc_confirm_ecocash($1)", [donation]);
  const r = await db.query("SELECT status FROM public.urc_donations");
  assert.equal(r.rows[0].status, "confirmed");
});
checks++;
await deny("editor", "SELECT public.urc_donation_summary()");
await deny("outsider", "SELECT public.urc_donation_summary()");
await as("owner", async () => {
  const r = await db.query("SELECT public.urc_donation_summary() AS totals");
  assert.equal(Number(r.rows[0].totals[0].amount_minor), 500);
  assert.equal(r.rows[0].totals[0].currency, "USD");
});
checks++;
await deny(
  "editor",
  "SELECT public.urc_record_donation($1,500,'USD','ecocash','TEST-REF')",
  [ids.event],
);
await as("service",()=>db.query('DELETE FROM public.urc_team WHERE user_id=$1',[ids.editor]));
await deny("editor","SELECT public.urc_record_donation($1,500,'USD','cash','')",[ids.event]);
await as("editor",async()=>{const r=await db.query("SELECT * FROM public.urc_entries");assert.equal(r.rows.length,0);});checks++;
console.log(
  `PASS: ${checks} database checks covering roles, draft isolation, private media, free passes, rate limits, repeated check-in and donation verification.`,
);
await db.close();
