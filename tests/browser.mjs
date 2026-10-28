import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const env = { ...process.env, PORT: "5202" };
for (const k of [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "URC_AI_ENABLED",
  "AI_GATEWAY_API_KEY",
])
  delete env[k];
const server = spawn("node", ["scripts/dev-server.mjs"], {
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(Error("Review server did not start.")),
    10000,
  );
  server.stdout.on("data", (chunk) => {
    if (String(chunk).includes("ready")) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.on("exit", (code) => reject(Error("Review server exited " + code)));
});
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const base = "http://127.0.0.1:5202",
  checks = [],
  errors = [];
function watch(page) {
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => errors.push(error.message));
}
const memberId = "44444444-4444-4444-8444-444444444444",
  alice = "55555555-5555-4555-8555-555555555555",
  eventId = "77777777-7777-4777-8777-777777777777";
const native = {
  id: eventId,
  kind: "event",
  title: "A local test run",
  slug: "local-test-run",
  status: "published",
  revision: 1,
  updated_at: "2026-10-27",
  payload: {
    startsAt: "2099-10-31T07:30:00+02:00",
    endsAt: "2099-10-31T12:00:00+02:00",
    purpose: "A local fixture for registration testing.",
    location: "Test venue",
    activities: "5 km;Walk",
    activityOptions: "5 km\nWalk",
    registration: "open",
    registrationMode: "free-pass",
    theme: "lime",
  },
};
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  watch(page);
  for (const [route, heading] of [
    ["/", "URC."],
    ["/events", "Runs"],
    ["/gallery", "Gallery"],
    ["/club", "The club"],
    ["/first-run", "Your first run."],
    ["/partners", "Partners"],
    ["/impact", "A reason to run."],
    ["/contact", "Let’s talk."],
    ["/join", "Your place is out there."],
    ["/shop", "Shop"],
    ["/account", "Your URC."],
    ["/privacy", "Your information."],
  ]) {
    await page.goto(base + route);
    await page
      .getByRole("heading", { name: heading, exact: true, level: 1 })
      .waitFor();
    assert.equal(await page.locator("h1").count(), 1, route);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      route,
    );
    checks.push("Dedicated page " + route);
  }
  await page.goto(base + "/");
  await page.getByRole("heading", { name: "URC.", exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('img[src="/assets/hero.webp"]').count(), 0);
  await page.screenshot({ path: "review/urc-home-desktop.png" });
  checks.push("Homepage uses real supplied-organiser photography");
  assert.equal(
    await page
      .locator(".race-hero-copy,.race-hero-bottom,.race-experience-photo")
      .count(),
    0,
  );
  assert.equal((await page.locator(".race-ticker").innerText()).trim(), "");
  assert.equal(await page.locator(".home-run-card").count(), 2);
  await page.getByRole("button", { name: "Discover run", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Sunday Social", exact: true })
    .waitFor();
  await page
    .getByText("This is a sample event for reviewing the card design.", {
      exact: false,
    })
    .waitFor();
  assert.equal(await page.getByRole("button", { name: /Reserve/ }).count(), 0);
  await page.keyboard.press("Escape");
  checks.push(
    "Photo-only hero and two landscape-image cards keep the sample run separate from real reservations",
  );
  await page.getByLabel("Navigation menu", { exact: true }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "open-site-menu",
  );
  checks.push("Desktop menu closes with Escape and restores keyboard focus");

  assert.equal(
    await page.locator('img[src="/assets/urc-emblem.jpg"]').count(),
    0,
  );
  assert.equal(await page.locator(".race-hero").count(), 1);
  await page.locator(".race-manifesto").scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => !document.querySelector(".route-word:not(.is-filled)"),
  );
  assert.equal(await page.locator(".urc-entrance").count(), 0);
  checks.push(
    "Race-world reduced-motion view is fully readable and does not use the rejected Eventbrite identity",
  );
  await page.getByRole("link", { name: "Discover run", exact: true }).click();
  await page.getByRole("button", { name: "Reserve a spot" }).click();
  await page.getByRole("dialog", { name: "RESET", exact: true }).waitFor();
  assert.equal(await page.locator(".ticket-choice").count(), 3);
  await page.keyboard.press("Escape");
  checks.push(
    "Homepage Discover run control opens the corresponding run and its real activity choices",
  );

  await page.goto(base + "/events/reset");
  await page
    .getByRole("heading", { name: "RESET", exact: true, level: 1 })
    .waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Register for this run" }).count(),
    0,
  );
  await page.getByRole("button", { name: "Reserve a spot" }).click();
  await page.getByRole("dialog", { name: "RESET", exact: true }).waitFor();
  assert.equal(await page.locator(".ticket-choice").count(), 3);
  await page
    .getByRole("button", { name: "Add Free run + cold plunge", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to your details", exact: false })
    .click();
  await page
    .getByText("URC reservations are not open on this website yet.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Confirm free reservation", exact: false })
      .isDisabled(),
    true,
  );
  await page.screenshot({
    path: "review/urc-reservation-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Close reservation", exact: true })
    .click();
  assert.equal(await page.locator("iframe").count(), 0);
  await page.route("https://maps.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Map transport fixture</p>",
    }),
  );
  await page
    .getByRole("button", { name: "Load venue map", exact: false })
    .click();
  assert.match(
    await page.locator("iframe").getAttribute("src"),
    /56%20Kingsmead/,
  );
  assert.equal(
    await page.locator("#event-calendar,#event-poster,[data-save]").count(),
    0,
  );
  assert.equal(await page.locator(".course-figures").count(), 1);
  assert.equal(await page.locator(".course-masthead h1").innerText(), "RESET");
  await page.screenshot({
    path: "review/urc-reset-desktop.png",
    fullPage: true,
  });
  checks.push(
    "RESET course layout keeps real ticket choices and click-to-load map while removing the former action bar",
  );
  await page.goto(base + "/first-run");
  await page
    .getByText("Around 35 min on the route.", { exact: true })
    .waitFor();
  await page.getByLabel("Distance in kilometres").fill("10");
  await page
    .getByText("Around 1 hr 10 min on the route.", { exact: true })
    .waitFor();
  checks.push(
    "First-run planner calculates duration from the visitor’s distance and pace",
  );
  await page.goto(base + "/gallery/from-the-community");
  await page
    .getByRole("heading", { name: "From the community", exact: true, level: 1 })
    .waitFor();
  await page.getByRole("button", { name: "View photo 1", exact: true }).click();
  await page.getByRole("dialog", { name: "Gallery photo" }).waitFor();
  await page.getByRole("button", { name: "Next photo", exact: true }).click();
  await page.getByText("2 / 5", { exact: true }).waitFor();
  await page.keyboard.press("ArrowLeft");
  await page.getByText("1 / 5", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForURL((url) => !url.hash);
  assert.equal(new URL(page.url()).hash, "");
  checks.push(
    "Real community album supports full-screen keyboard photo navigation",
  );
  await page.goto(base + "/community?tab=people");
  await page.waitForURL("**/club");
  await page
    .getByRole("heading", { name: "The club", exact: true, level: 1 })
    .waitFor();
  await page.getByLabel("Navigation menu", { exact: true }).click();
  assert.equal(
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Community", exact: true })
      .count(),
    0,
  );
  await page.keyboard.press("Escape");
  checks.push(
    "Paused Community routes to The Club and is absent from navigation",
  );
  for (const route of [
    "/",
    "/events/reset",
    "/gallery/from-the-community",
    "/community",
    "/club",
    "/first-run",
    "/partners",
    "/contact",
    "/account",
    "/shop",
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      route + " on phone",
    );
  }
  await page.goto(base + "/");
  await page.getByRole("heading", { name: "URC.", exact: true }).waitFor();
  await page.screenshot({ path: "review/urc-home-mobile.png", fullPage: true });
  await page.getByLabel("Navigation menu", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Gallery", exact: true })
    .click();
  await page.waitForURL("**/gallery");
  checks.push(
    "Ten phone layouts fit 390px and the mobile menu navigates to real pages",
  );
  await page.goto(base + "/studio?preview=1");
  await page.getByRole("button", { name: /Participants/ }).click();
  await page
    .getByRole("heading", { name: "Participants", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "← Studio home", exact: true })
    .click();
  await page.getByRole("button", { name: /Manage runs/ }).click();
  await page.getByRole("button", { name: "New run +", exact: true }).click();
  assert.equal(
    await page
      .getByLabel("Optional participant limit", { exact: false })
      .isVisible(),
    false,
  );
  await page.getByText("2. Registration and updates", { exact: true }).click();
  assert.equal(
    await page
      .getByLabel("Optional participant limit", { exact: false })
      .isVisible(),
    true,
  );
  await page.getByText("2. Registration and updates", { exact: true }).click();
  await page.getByText("Writing assistant", { exact: true }).click();
  await page
    .getByRole("button", {
      name: "Draft from these notes with AI",
      exact: true,
    })
    .click();
  await page
    .getByText("AI is disabled in the layout preview.", { exact: false })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "review/urc-studio-mobile.png",
    fullPage: true,
  });
  checks.push(
    "Phone Studio routes to operations and AI preview cannot spend tokens",
  );
  await page.goto(base + "/pass?preview=1");
  await page
    .getByRole("button", { name: "Download PDF", exact: false })
    .waitFor();
  const pdfPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download PDF", exact: false })
    .click();
  const pdf = await pdfPromise;
  assert.match(pdf.suggestedFilename(), /-preview.pdf$/);
  assert.equal(
    (await readFile(await pdf.path())).subarray(0, 4).toString(),
    "%PDF",
  );
  checks.push("Preview pass generates a real, explicitly invalid sample PDF");
  // Frontend integration fixtures exercise connected flows; permission rules are tested in PGlite.
  const connected = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  // Preserve the archived Community integration checks behind an explicit local transport fixture.
  await connected.route("**/club.json", async (route) => {
    const config = JSON.parse(await readFile("public/club.json", "utf8"));
    await route.fulfill({ json: { ...config, communityEnabled: true } });
  });
  const user = {
    id: memberId,
    email: "member@example.invalid",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: {},
  };
  const jwt = [
    { alg: "HS256", typ: "JWT" },
    { sub: memberId, role: "authenticated", exp: 4102444800 },
    "fixture",
  ]
    .map((x, i) =>
      i < 2 ? Buffer.from(JSON.stringify(x)).toString("base64url") : x,
    )
    .join(".");
  await connected.addInitScript(
    (s) =>
      localStorage.setItem(
        "sb-ktfwfeuyrpvelvpdborw-auth-token",
        JSON.stringify(s),
      ),
    {
      access_token: jwt,
      refresh_token: "fixture",
      expires_at: 4102444800,
      expires_in: 3600,
      token_type: "bearer",
      user,
    },
  );
  let follows = [],
    connection = {
      id: "88888888-8888-4888-8888-888888888888",
      requester: alice,
      recipient: memberId,
      status: "pending",
    },
    profile = {
      display_name: "Test member",
      handle: "test-member",
      bio: "A public test profile",
      public_profile: true,
      connections_enabled: true,
      news_opt_in: false,
    },
    savedProfile;
  await connected.route("**/api/content", (route) =>
    route.fulfill({ json: { configured: true, entries: [native] } }),
  );
  await connected.route("**/api/studio/config", (route) =>
    route.fulfill({
      json: {
        configured: true,
        url: "https://ktfwfeuyrpvelvpdborw.supabase.co",
        publishableKey: "sb_publishable_fixture",
        loginMethod: "password",
      },
    }),
  );
  await connected.route("**/api/community", (route) => {
    const d = route.request().postDataJSON();
    return route.fulfill({
      json:
        d.action === "people"
          ? {
              configured: true,
              people: [
                {
                  user_id: alice,
                  handle: "alice-runner",
                  display_name: "Alice",
                  bio: "A member in Harare",
                  connections_enabled: true,
                },
                { user_id: memberId, ...profile },
              ],
            }
          : { configured: true, stats: { followers: follows.length } },
    });
  });
  await connected.route(
    "https://ktfwfeuyrpvelvpdborw.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname.split("/").at(-1);
      let data = [];
      if (path === "user") data = user;
      if (path === "urc_member_profiles") {
        if (req.method() === "POST") {
          savedProfile = req.postDataJSON();
          profile = { ...profile, ...savedProfile };
          data = null;
        } else data = profile;
      }
      if (path === "urc_connections") data = [connection];
      if (path === "urc_follows")
        data = url.searchParams.has("subject_id")
          ? (follows[0] ?? null)
          : follows;
      if (path === "urc_follow") {
        const d = req.postDataJSON();
        follows = d.following
          ? [{ subject_type: d.target_type, subject_id: d.target_id }]
          : [];
        data = null;
      }
      if (path === "urc_connection_reply") {
        connection.status = req.postDataJSON().decision;
        data = null;
      }
      if (path === "urc_member_passes") data = [];
      if (path === "urc_team")
        data = { role: "owner", display_name: "Test organiser" };
      if (path === "urc_entries") data = [native];
      if (path === "urc_ops")
        data = { registrations: 0, checkins: 0, requests: 0, events: [] };
      await route.fulfill({
        json: data,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization,apikey,x-client-info,content-type",
        },
      });
    },
  );
  const memberPage = await connected.newPage();
  watch(memberPage);
  await memberPage.goto(base + "/community");
  await memberPage
    .getByRole("button", { name: "Follow URC", exact: true })
    .click();
  await memberPage
    .getByRole("button", { name: "Following URC ✓", exact: true })
    .waitFor();
  assert.equal(follows[0].subject_id, "urc");
  await memberPage.goto(base + "/account");
  await memberPage
    .getByRole("heading", { name: "Your member profile.", exact: true })
    .waitFor();
  await memberPage.getByRole("button", { name: "Accept", exact: true }).click();
  await memberPage.getByText("accepted · Received", { exact: true }).waitFor();
  await memberPage
    .getByLabel("Display name", { exact: true })
    .fill("Updated member");
  await memberPage
    .getByRole("button", { name: "Save profile", exact: false })
    .click();
  await memberPage.getByText("Profile saved.", { exact: true }).waitFor();
  assert.equal(savedProfile.display_name, "Updated member");
  assert.equal(savedProfile.news_opt_in, false);
  const memberExportPromise = memberPage.waitForEvent("download");
  await memberPage
    .getByRole("button", { name: "Download my profile", exact: true })
    .click();
  const memberExport = await memberExportPromise;
  const memberExportData = JSON.parse(
    await readFile(await memberExport.path(), "utf8"),
  );
  assert.equal(memberExportData.profile.display_name, "Updated member");
  checks.push(
    "Signed-in member can export their own updated profile after event download controls are removed",
  );
  checks.push(
    "Connected member UI saves follows and private preferences and accepts a received connection request",
  );
  await memberPage.goto(base + "/events/local-test-run");
  await memberPage
    .getByRole("heading", { name: "A local test run", exact: true, level: 1 })
    .waitFor();
  await memberPage
    .getByRole("button", { name: "Reserve a spot", exact: false })
    .click();
  await memberPage
    .getByRole("button", { name: "Add Walk", exact: true })
    .click();
  await memberPage
    .getByRole("button", { name: "Continue to your details", exact: false })
    .click();
  await memberPage
    .getByRole("textbox", { name: "First name", exact: true })
    .nth(0)
    .fill("First");
  await memberPage
    .getByRole("textbox", { name: "Last name", exact: true })
    .nth(0)
    .fill("runner");
  await memberPage
    .getByRole("textbox", { name: "First name", exact: true })
    .nth(1)
    .fill("Second");
  await memberPage
    .getByRole("textbox", { name: "Last name", exact: true })
    .nth(1)
    .fill("runner");
  await memberPage
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill("runner@example.invalid");
  await memberPage
    .getByRole("button", { name: "Change experiences", exact: false })
    .click();
  await memberPage
    .getByRole("button", { name: "Continue to your details", exact: false })
    .click();
  assert.equal(
    await memberPage
      .getByRole("textbox", { name: "First name", exact: true })
      .nth(1)
      .inputValue(),
    "Second",
  );
  await connected.route("**/api/register", async (route) => {
    const d = route.request().postDataJSON();
    assert.equal(d.name, "First runner");
    assert.equal(d.companions[0].name, "Second runner");
    assert.equal(d.companions[0].activity, "Walk");
    await route.fulfill({
      status: 201,
      json: {
        passes: [
          { name: "First runner", path: "/pass#" + "a".repeat(43) },
          { name: "Second runner", path: "/pass#" + "b".repeat(43) },
        ],
      },
    });
  });
  await memberPage
    .getByRole("checkbox", { name: "I have read", exact: false })
    .check();
  await memberPage
    .getByRole("button", { name: "Confirm free reservation", exact: false })
    .click();
  await memberPage
    .getByText("Your places are reserved.", { exact: true })
    .waitFor();
  assert.equal(
    await memberPage.locator('.reservation-dialog a[href^="/pass#"]').count(),
    2,
  );
  checks.push(
    "Guest-style quantity reservations preserve details and produce a separate private pass for every confirmed participant",
  );
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await guestContext.route("**/api/content", (route) =>
    route.fulfill({ json: { configured: true, entries: [native] } }),
  );
  await guestContext.route("**/api/studio/config", (route) =>
    route.fulfill({
      json: {
        configured: true,
        url: "https://ktfwfeuyrpvelvpdborw.supabase.co",
        publishableKey: "sb_publishable_fixture",
      },
    }),
  );
  let attempts = 0;
  await guestContext.route("**/api/register", async (route) => {
    assert.equal(route.request().headers().authorization, undefined);
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 409,
        json: {
          error:
            "This activity has just filled up. Please choose another option.",
        },
      });
    else
      await route.fulfill({
        status: 201,
        json: { name: "Guest Runner", path: "/pass#" + "c".repeat(43) },
      });
  });
  const guestPage = await guestContext.newPage();
  watch(guestPage);
  await guestPage.goto(base + "/events/local-test-run");
  await guestPage
    .getByRole("button", { name: "Reserve a spot", exact: false })
    .click();
  await guestPage
    .getByRole("button", { name: "Continue to your details", exact: false })
    .click();
  await guestPage
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Guest");
  await guestPage
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill("Runner");
  await guestPage
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill("guest@example.invalid");
  await guestPage
    .getByRole("checkbox", { name: "I have read", exact: false })
    .check();
  await guestPage
    .getByRole("button", { name: "Confirm free reservation", exact: false })
    .click();
  await guestPage
    .getByText("This activity has just filled up.", { exact: false })
    .waitFor();
  assert.equal(await guestPage.locator(".reservation-success").count(), 0);
  assert.equal(
    await guestPage
      .getByRole("textbox", { name: "First name", exact: true })
      .inputValue(),
    "Guest",
  );
  await guestPage
    .getByRole("button", { name: "Change experiences", exact: false })
    .click();
  await guestPage
    .getByRole("button", { name: "Remove 5 km", exact: true })
    .click();
  await guestPage
    .getByRole("button", { name: "Add Walk", exact: true })
    .click();
  await guestPage
    .getByRole("button", { name: "Continue to your details", exact: false })
    .click();
  await guestPage
    .getByRole("checkbox", { name: "I have read", exact: false })
    .check();
  await guestPage
    .getByRole("button", { name: "Confirm free reservation", exact: false })
    .click();
  await guestPage
    .getByText("Your places are reserved.", { exact: true })
    .waitFor();
  assert.equal(attempts, 2);
  assert.equal(
    await guestPage.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  checks.push(
    "Guest booking requires no account, preserves entries after a capacity error and only confirms a saved reservation",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "review/revamp-browser-results.json",
    JSON.stringify(
      {
        checks,
        errors,
        note: "Local HTTP server; curated public sources plus explicit transport fixtures for connected member/group flows. No production registrations, private user reads or AI calls.",
      },
      null,
      2,
    ),
  );
  console.log(`PASS ${checks.length} URC browser checks.`);
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
