import jsQR from "jsqr";
import { createClient } from "@supabase/supabase-js";
import { entryIssues, slugify } from "../lib/entries.js";
const $ = (q, root = document) => root.querySelector(q),
  $$ = (q, root = document) => [...root.querySelectorAll(q)];
const preview = new URL(location.href).searchParams.get("preview") === "1";
let client = null,
  staff = null,
  rows = [],
  kind = "event",
  entry = null,
  busy = false,
  dirty = false,
  publicConfig = null;
const labels = {
  event: ["Runs", "run"],
  album: ["Photos", "gallery"],
  recap: ["Recaps", "recap"],
  partner: ["Partners", "partner"],
  page: ["Website", "page"],
};
const fields = {
  event: [
    ["title", "Run title", "text", "Give this run a clear name."],
    ["slug", "Web address", "text", "The permanent link for this event."],
    [
      "startsAt",
      "Date and start time",
      "datetime-local",
      "Times are displayed in Harare time.",
    ],
    [
      "location",
      "Meeting point",
      "text",
      "Add a confirmed, specific location.",
    ],
    [
      "activities",
      "Distances and pace",
      "text",
      "For example, a walk and a conversational run.",
    ],
    [
      "purpose",
      "The purpose and charity",
      "textarea",
      "Explain why this run matters and who benefits.",
    ],
    [
      "partnerOffer",
      "Partner experience",
      "text",
      "Optional: what happens around the run?",
    ],
    [
      "offerTerms",
      "Offer details and terms",
      "textarea",
      "Who is eligible, when it expires and how to redeem.",
    ],
    [
      "registration",
      "Registration",
      "select",
      "Free attendance and optional giving are separate.",
    ],
    [
      "registrationMode",
      "Registration method",
      "registrationMode",
      "Free URC PDF passes do not require email delivery.",
    ],
    [
      "capacity",
      "Optional participant limit",
      "number",
      "Leave empty if no attendance cap is needed.",
    ],
    [
      "joinUrl",
      "Verified registration link",
      "url",
      "Leave empty until registration is connected.",
    ],
    [
      "theme",
      "Event theme",
      "theme",
      "URC’s navigation and identity stay consistent.",
    ],
  ],
  album: [
    ["title", "Gallery title", "text", "Usually the run name and date."],
    ["slug", "Web address", "text", "Keep this album’s permanent link."],
    [
      "eventId",
      "Which run?",
      "events",
      "Choose the event these photographs belong to.",
    ],
    [
      "summary",
      "A few words about the day",
      "textarea",
      "A short introduction to the gallery.",
    ],
  ],
  recap: [
    ["title", "Recap title", "text", "The story of the day."],
    ["slug", "Web address", "text", "A shareable address for the recap."],
    ["eventId", "Which run?", "events", "Attach the recap to its event."],
    [
      "summary",
      "The run summary",
      "textarea",
      "What happened, what stood out and what comes next.",
    ],
    [
      "verifiedImpact",
      "Verified impact",
      "textarea",
      "Only include amounts and outcomes you have confirmed.",
    ],
  ],
  partner: [
    [
      "title",
      "Partner name",
      "text",
      "The confirmed name shown on the website.",
    ],
    ["slug", "Web address", "text", "A short, stable address."],
    [
      "partnerType",
      "Type of support",
      "partnerType",
      "Distinguish money, services and experiences.",
    ],
    [
      "contribution",
      "What do they do for URC?",
      "textarea",
      "Describe their actual contribution in plain language.",
    ],
    ["url", "Partner website", "url", "A verified https:// link."],
    [
      "relatedEvents",
      "Related events",
      "text",
      "Names or links for the runs they support.",
    ],
  ],
  page: [
    [
      "title",
      "Page or section name",
      "text",
      "For example, Homepage introduction.",
    ],
    [
      "slug",
      "Page key",
      "text",
      "A stable key, for example homepage-introduction.",
    ],
    ["summary", "Website copy", "textarea", "Plain text, ready for the page."],
    [
      "joinUrl",
      "Community join link",
      "url",
      "Add the verified WhatsApp or community link.",
    ],
    [
      "announcement",
      "Announcement",
      "textarea",
      "A short, current update for the community.",
    ],
  ],
};
function show(screen) {
  stopCamera();
  for (const id of [
    "studio-home",
    "studio-list",
    "studio-editor",
    "shop-setup",
    "event-day",
    "team-setup",
  ])
    $("#" + id).hidden = id !== screen;
  window.scrollTo(0, 0);
}
function message(text, error = false) {
  const box = $("#studio-status");
  box.textContent = text;
  box.classList.toggle("preview", preview || error);
}
function toast(text) {
  const node = $("#studio-toast");
  node.textContent = text;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.hidden = true), 4000);
}
function make(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function leave() {
  return !dirty || confirm("You have unsaved changes. Leave this draft?");
}
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
$("#workspace-date").textContent = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Africa/Harare",
}).format(new Date());
async function loadRows() {
  if (preview) return;
  const { data, error } = await client
    .from("urc_entries")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  rows = data ?? [];
}
async function workspace() {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw Error("Sign in to continue.");
  const { data, error: roleError } = await client
    .from("urc_team")
    .select("role,display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (roleError || !data)
    throw Error("This account has not been given URC team access.");
  staff = { ...data, user_id: user.id };
  await loadRows();
  $("#team-task").hidden = staff.role !== "owner";
  $$("[data-section]").forEach((button) => {
    if (staff.role === "checkin")
      button.hidden = button.dataset.section !== "day";
  });
  $("#login-panel").hidden = true;
  $("#workspace").hidden = false;
  $("#sign-out").hidden = false;
  $("#welcome-name").textContent =
    `Hello, ${staff.display_name}. What would you like to do?`;
  message("You’re in URC Studio. Changes become public only when you publish.");
  show("studio-home");
}
async function init() {
  if (preview) {
    staff = { role: "preview", display_name: "Team" };
    $("#workspace").hidden = false;
    message(
      "Workspace layout preview. No real login, uploads, payments or publishing. Drafts stay in this open preview.",
    );
    show("studio-home");
    return;
  }
  $("#login-panel").hidden = false;
  try {
    const response = await fetch("/api/studio/config");
    if (!response.ok) throw Error("Team sign-in is temporarily unavailable.");
    publicConfig = await response.json();
    if (!publicConfig.configured) {
      $("#send-code").disabled = true;
      message(
        "Team access is being connected to URC’s own database. The workspace layout is available below.",
      );
      return;
    }
    client = createClient(publicConfig.url, publicConfig.publishableKey);
    const setup = new URLSearchParams(location.hash.slice(1));
    if (
      ["invite", "recovery"].includes(setup.get("type")) &&
      setup.get("token_hash")
    ) {
      const { error } = await client.auth.verifyOtp({
        token_hash: setup.get("token_hash"),
        type: setup.get("type"),
      });
      history.replaceState(null, "", "/studio");
      if (error)
        throw Error(
          "This setup link has expired or has already been used. Ask the owner for a new private link.",
        );
      $("#login-form").hidden = true;
      $("#password-setup").hidden = false;
      message("Choose your own password to finish your team setup.");
      return;
    }
    if (publicConfig.loginMethod !== "email-code") {
      $(".login-card>p").textContent =
        "Sign in with your invited email and password. Your device can remember your login.";
      const label = make("label", "Password");
      label.htmlFor = "team-password";
      const input = make("input");
      input.id = "team-password";
      input.type = "password";
      input.autocomplete = "current-password";
      input.required = true;
      $("#login-form").insertBefore(label, $("#send-code"));
      $("#login-form").insertBefore(input, $("#send-code"));
      $("#send-code").firstChild.textContent = "Sign in ";
    }
    const {
      data: { session },
    } = await client.auth.getSession();
    if (session) await workspace();
    else message("Sign in to manage the community.");
  } catch (error) {
    $("#send-code").disabled = !client;
    message(error.message, true);
  }
}
$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client || busy) return;
  busy = true;
  $("#send-code").disabled = true;
  try {
    const email = $("#team-email").value.trim();
    if (publicConfig.loginMethod === "email-code") {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error)
        throw Error(
          "We couldn’t send a code. Check your invited email or contact the owner.",
        );
      $("#login-form").hidden = true;
      $("#code-form").hidden = false;
      $("#login-message").textContent = "Check your email for a sign-in code.";
      $("#email-code").focus();
    } else {
      const { error } = await client.auth.signInWithPassword({
        email,
        password: $("#team-password").value,
      });
      if (error)
        throw Error(
          "That email and password could not be verified. Please try again.",
        );
      await workspace();
      $("#team-password").value = "";
    }
  } catch (error) {
    $("#login-message").textContent = error.message;
  } finally {
    busy = false;
    $("#send-code").disabled = false;
  }
});
$("#code-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client || busy) return;
  busy = true;
  const button = $("button[type=submit]", event.currentTarget);
  button.disabled = true;
  try {
    const { error } = await client.auth.verifyOtp({
      email: $("#team-email").value.trim(),
      token: $("#email-code").value.trim(),
      type: "email",
    });
    if (error)
      throw Error(
        "That code has expired or could not be verified. Request a new code.",
      );
    await workspace();
    $("#email-code").value = "";
  } catch (error) {
    $("#login-message").textContent = error.message;
  } finally {
    busy = false;
    button.disabled = false;
  }
});
$("#change-email").addEventListener("click", () => {
  $("#code-form").hidden = true;
  $("#login-form").hidden = false;
  $("#login-message").textContent = "";
  $("#team-email").focus();
});
$("#sign-out").addEventListener("click", async () => {
  if (!leave()) return;
  const { error } = await client.auth.signOut();
  if (error) {
    toast("Sign-out could not finish. Please try again.");
    return;
  }
  dirty = false;
  staff = null;
  rows = [];
  location.replace("/studio");
});
function list(type) {
  kind = type;
  show("studio-list");
  $("#list-title").textContent = labels[kind][0].toUpperCase();
  $("#new-entry").textContent = `New ${labels[kind][1]} +`;
  const root = $("#entry-list");
  root.replaceChildren();
  const items = rows.filter((row) => row.kind === kind);
  if (!items.length) {
    const box = make("div", undefined, "studio-empty");
    box.append(
      make("h2", `YOUR FIRST ${labels[kind][1].toUpperCase()} STARTS HERE.`),
      make("p", "Create a draft, review it and publish when it’s ready."),
    );
    root.append(box);
  }
  for (const row of items) {
    const button = make("button", undefined, "entry-row"),
      text = make("span");
    text.append(
      make("strong", row.title),
      make(
        "small",
        `${row.status === "published" ? "Published" : "Draft"} · ${row.updated_at ? new Date(row.updated_at).toLocaleDateString("en-GB") : "Not saved"}`,
      ),
    );
    button.append(text, make("span", "↗"));
    button.addEventListener("click", () => edit(row));
    root.append(button);
  }
}
$$("[data-section]").forEach((button) =>
  button.addEventListener("click", () => {
    if (!leave()) return;
    dirty = false;
    button.dataset.section === "shop"
      ? show("shop-setup")
      : button.dataset.section === "team"
        ? openTeam()
        : button.dataset.section === "day"
          ? openEventDay()
          : list(button.dataset.section);
  }),
);
$("#back-home").addEventListener("click", () => show("studio-home"));
$("#back-shop").addEventListener("click", () => show("studio-home"));
$("#back-list").addEventListener("click", () => {
  if (leave()) {
    dirty = false;
    list(kind);
  }
});
$("#new-entry").addEventListener("click", () => edit());
function edit(row) {
  entry = row
    ? structuredClone(row)
    : {
        id: crypto.randomUUID(),
        kind,
        title: "",
        slug: "",
        status: "draft",
        payload: {
          photos: [],
          theme: "lime",
          registration: "coming-soon",
          registrationMode: "free-pass",
        },
        revision: 0,
      };
  dirty = false;
  show("studio-editor");
  $("#editor-kind").textContent =
    `${row ? "EDIT" : "NEW"} ${labels[kind][1].toUpperCase()}`;
  $("#editor-title").textContent =
    row?.title || `CREATE A ${labels[kind][1].toUpperCase()}.`;
  $("#photo-panel").hidden = kind === "recap";
  $(".upload-zone h2").textContent =
    kind === "partner"
      ? "ADD THE PARTNER LOGO."
      : kind === "album"
        ? "ADD THE MOMENTS."
        : "CHOOSE THE COVER.";
  $("#save-message").textContent = preview
    ? "Preview draft"
    : row
      ? "Saved"
      : "New draft";
  $("#entry-issues").hidden = true;
  renderFields();
  renderPhotos();
}
function renderFields() {
  const root = $("#editor-fields");
  root.replaceChildren();
  for (const [key, label, type, hint] of fields[kind]) {
    const field = make(
      "label",
      undefined,
      "editor-field" + (type === "textarea" ? " wide" : ""),
    );
    field.append(make("span", label));
    let input;
    if (
      ["events", "select", "theme", "partnerType", "registrationMode"].includes(
        type,
      )
    ) {
      input = make("select");
      let choices =
        type === "events"
          ? [
              ["", "Choose a run"],
              ...rows
                .filter((row) => row.kind === "event")
                .map((row) => [row.id, row.title]),
            ]
          : type === "select"
            ? [
                ["coming-soon", "Coming soon"],
                ["open", "Registration open"],
                ["closed", "Registration closed"],
              ]
            : type === "registrationMode"
              ? [
                  ["free-pass", "Free URC PDF pass"],
                  ["external", "External registration link"],
                ]
              : type === "theme"
                ? [
                    ["lime", "URC green"],
                    ["rose", "Awareness / rose"],
                    ["ice", "Recovery / ice"],
                  ]
                : [
                    ["in-kind", "In-kind services"],
                    ["donation", "Financial support"],
                    ["venue", "Venue or space"],
                    ["offer", "Participant discount"],
                    ["experience", "Experience or recovery"],
                  ];
      for (const [value, text] of choices) {
        const option = make("option", text);
        option.value = value;
        input.append(option);
      }
    } else {
      input = make(type === "textarea" ? "textarea" : "input");
      if (type !== "textarea") input.type = type;
    }
    input.name = key;
    input.value =
      key === "title" || key === "slug"
        ? (entry[key] ?? "")
        : type === "datetime-local" && entry.payload[key]
          ? new Date(Date.parse(entry.payload[key]) + 7200000)
              .toISOString()
              .slice(0, 16)
          : (entry.payload[key] ?? "");
    input.addEventListener("input", () => {
      if (key === "title" || key === "slug") {
        entry[key] = input.value;
        if (key === "title" && !entry.slug) {
          const slugInput = $("[name=slug]", root);
          if (slugInput) slugInput.placeholder = slugify(input.value);
        }
      } else
        entry.payload[key] =
          type === "datetime-local" && input.value
            ? new Date(input.value + "+02:00").toISOString()
            : input.value;
      dirty = true;
      $("#save-message").textContent = "Unsaved changes";
    });
    field.append(input, make("small", hint));
    root.append(field);
  }
}
async function save(publish = false) {
  if (busy || !entry) return false;
  entry.slug = slugify(entry.slug || entry.title);
  $("[name=slug]", $("#editor-fields")).value = entry.slug;
  const candidate = {
    ...entry,
    status: publish
      ? "published"
      : entry.status === "published"
        ? "published"
        : "draft",
  };
  const issues = entryIssues(candidate, publish);
  const box = $("#entry-issues");
  box.replaceChildren(...issues.map((issue) => make("p", issue)));
  box.hidden = !issues.length;
  if (issues.length) {
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return false;
  }
  if (preview) {
    entry = { ...candidate, updated_at: new Date().toISOString() };
    const index = rows.findIndex((row) => row.id === entry.id);
    if (index < 0) rows.unshift(structuredClone(entry));
    else rows[index] = structuredClone(entry);
    dirty = false;
    $("#save-message").textContent = "Kept in this preview only";
    toast("Preview draft kept. Nothing is published.");
    return true;
  }
  busy = true;
  $$(".studio-savebar button").forEach((b) => (b.disabled = true));
  $("#save-message").textContent = "Saving…";
  try {
    let result;
    const data = {
      kind: entry.kind,
      title: entry.title.trim(),
      slug: entry.slug,
      status: entry.status,
      payload: entry.payload,
      revision: entry.revision + 1,
      publish_requested: publish,
    };
    if (entry.revision === 0)
      result = await client
        .from("urc_entries")
        .insert({ id: entry.id, ...data })
        .select()
        .single();
    else
      result = await client
        .from("urc_entries")
        .update(data)
        .eq("id", entry.id)
        .eq("revision", entry.revision)
        .select()
        .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data)
      throw Error(
        "Someone else updated this draft. Your changes are still here; reopen the saved version before replacing it.",
      );
    entry = result.data;
    dirty = false;
    await loadRows();
    $("#save-message").textContent = publish
      ? "Published"
      : entry.status === "published"
        ? "Draft saved; live version unchanged"
        : "Draft saved";
    toast(publish ? "Published to the website." : "Draft saved.");
    return true;
  } catch (error) {
    $("#save-message").textContent = "Not saved — try again";
    box.replaceChildren(
      make(
        "p",
        error.message ||
          "The save could not finish. Your changes are still here.",
      ),
    );
    box.hidden = false;
    return false;
  } finally {
    busy = false;
    $$(".studio-savebar button").forEach((b) => (b.disabled = false));
  }
}
$("#entry-form").addEventListener("submit", (event) => {
  event.preventDefault();
  save(false);
});
$("#publish-entry").addEventListener("click", () => {
  if (preview) {
    toast("Publishing is disabled in the layout preview.");
    return;
  }
  save(true);
});
$("#choose-photos").addEventListener("click", () => {
  if (preview) {
    toast("Photo uploads connect to URC’s private media storage after setup.");
    return;
  }
  $("#photo-input").click();
});
async function preparePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error(
      "Choose a JPG, PNG or WebP photo. Your iPhone can export a compatible copy.",
    );
  if (file.size > 25 * 1024 * 1024)
    throw Error("Choose photos smaller than 25 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
        1,
        2048 / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );
    if (!blob)
      throw Error("This photo could not be prepared. Try another image.");
    const hash = [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
      ),
    ]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    return { blob, hash };
  } finally {
    URL.revokeObjectURL(url);
  }
}
$("#photo-input").addEventListener("change", async (event) => {
  const files = [...event.target.files];
  event.target.value = "";
  if (!files.length || busy || preview) return;
  if (entry.revision === 0 && !(await save(false))) return;
  let completed = 0,
    skipped = 0;
  $("#choose-photos").disabled = true;
  for (const file of files) {
    try {
      $("#upload-status").textContent =
        `Preparing photo ${completed + skipped + 1} of ${files.length}…`;
      const { blob, hash } = await preparePhoto(file);
      if (entry.payload.photos?.some((photo) => photo.hash === hash)) {
        skipped++;
        continue;
      }
      const path = `${staff.user_id}/${crypto.randomUUID()}.${blob.type === "image/webp" ? "webp" : "png"}`;
      const { error } = await client.storage
        .from("urc-media")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      entry.payload.photos = [
        ...(entry.payload.photos ?? []),
        { id: crypto.randomUUID(), path, hash, caption: "", alt: "" },
      ];
      if (!entry.payload.coverPath) entry.payload.coverPath = path;
      dirty = true;
      if (!(await save(false))) {
        throw Error(
          "Photo uploaded, but its gallery could not be saved. Keep this page open and save the draft again.",
        );
      }
      completed++;
      await renderPhotos();
    } catch (error) {
      $("#upload-status").textContent =
        `${completed} uploaded. ${error.message} Select any remaining photos to retry.`;
      $("#choose-photos").disabled = false;
      return;
    }
  }
  $("#upload-status").textContent =
    `${completed} photo${completed === 1 ? "" : "s"} uploaded${skipped ? `; ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}. Choose a cover and review the gallery before publishing.`;
  $("#choose-photos").disabled = false;
});
async function renderPhotos() {
  const root = $("#photo-grid");
  root.replaceChildren();
  for (const [index, photo] of (entry?.payload.photos ?? []).entries()) {
    const card = make("div", undefined, "studio-photo"),
      image = make("img");
    image.alt = photo.alt || photo.caption || "Gallery photo";
    if (client && photo.path) {
      const { data } = await client.storage
        .from("urc-media")
        .createSignedUrl(photo.path, 600);
      if (data?.signedUrl) image.src = data.signedUrl;
    }
    const controls = make("div"),
      label = make("label", "Caption"),
      input = make("input");
    input.value = photo.caption ?? "";
    input.addEventListener("input", () => {
      photo.caption = input.value;
      dirty = true;
      $("#save-message").textContent = "Unsaved changes";
    });
    label.append(input);
    const actions = make("div", undefined, "photo-actions"),
      cover = make("button", index === 0 ? "Cover photo ✓" : "Make cover"),
      remove = make("button", "Remove");
    cover.type = remove.type = "button";
    cover.addEventListener("click", () => {
      entry.payload.photos.splice(index, 1);
      entry.payload.photos.unshift(photo);
      entry.payload.coverPath = photo.path;
      dirty = true;
      renderPhotos();
      $("#save-message").textContent = "Unsaved changes";
    });
    remove.addEventListener("click", () => {
      if (confirm("Remove this photo from the gallery?")) {
        entry.payload.photos = entry.payload.photos.filter(
          (p) => p.id !== photo.id,
        );
        entry.payload.coverPath = entry.payload.photos[0]?.path ?? null;
        dirty = true;
        renderPhotos();
        $("#save-message").textContent = "Unsaved changes";
      }
    });
    actions.append(cover, remove);
    controls.append(label, actions);
    card.append(image, controls);
    root.append(card);
  }
}
function amountMinor(value) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim()))
    throw Error("Use an amount such as 5 or 5.50.");
  const [whole, decimal = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number((decimal + "00").slice(0, 2));
  if (amount <= 0) throw Error("Enter an amount greater than zero.");
  return amount;
}
async function openEventDay() {
  show("event-day");
  $("#donation-panel").hidden =
    !preview && !["owner", "editor"].includes(staff?.role);
  $("#donation-history").hidden = $("#donation-panel").hidden;
  const select = $("#donation-event");
  select.replaceChildren(make("option", "Choose a run"));
  select.firstChild.value = "";
  for (const row of rows.filter((row) => row.kind === "event")) {
    const option = make("option", row.title);
    option.value = row.id;
    select.append(option);
  }
  await loadDonations();
}
$("#back-day").addEventListener("click", () => show("studio-home"));
$("#checkin-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (preview) {
    $("#checkin-result").textContent =
      "Layout preview only. A real pass cannot be checked in here.";
    return;
  }
  const button = $("button[type=submit]", event.currentTarget);
  button.disabled = true;
  try {
    let reference = $("#pass-reference").value.trim();
    if (reference.includes("#")) {
      const url = new URL(reference);
      if (url.origin !== location.origin)
        throw Error("Use a pass from this URC website.");
      reference = url.hash.slice(1);
    }
    if (/^[A-Za-z0-9_-]{43}$/.test(reference))
      reference = [
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(reference),
          ),
        ),
      ]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    else if (!/^[A-F0-9]{10}$/i.test(reference))
      throw Error(
        "Enter the pass’s 10-character code or its full private link.",
      );
    const { data, error } = await client.rpc("urc_check_in", {
      pass_reference: reference,
    });
    if (error) throw error;
    $("#checkin-result").textContent = data.alreadyUsed
      ? `Already checked in: ${data.name} · ${data.event}. Check with the run lead before admitting again.`
      : `Welcome, ${data.name}. Check-in confirmed for ${data.event}.`;
  } catch (error) {
    $("#checkin-result").textContent =
      error.message || "The pass could not be checked. Try again.";
  } finally {
    button.disabled = false;
  }
});
$("#donation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (preview) {
    $("#donation-result").textContent =
      "Layout preview only. No donation record has been created.";
    return;
  }
  const button = $("button[type=submit]", event.currentTarget);
  button.disabled = true;
  try {
    const method = $("#donation-method").value,
      reference = $("#donation-reference").value.trim();
    if (method === "ecocash" && !reference)
      throw Error("Add the EcoCash transaction reference.");
    const { error } = await client.rpc("urc_record_donation", {
      event: $("#donation-event").value,
      minor_amount: amountMinor($("#donation-amount").value),
      donation_currency: $("#donation-currency").value,
      payment_method: method,
      payment_reference: reference,
    });
    if (error) throw error;
    $("#donation-result").textContent =
      method === "cash"
        ? "Cash donation recorded under your team account. Thank you."
        : "EcoCash reference recorded as pending. It must be checked against the merchant’s transaction record.";
    $("#donation-amount").value = "";
    $("#donation-reference").value = "";
    await loadDonations();
  } catch (error) {
    $("#donation-result").textContent =
      error.message || "The donation record could not be saved.";
  } finally {
    button.disabled = false;
  }
});
async function loadDonations() {
  const root = $("#donation-list");
  root.replaceChildren();
  if (preview) {
    root.append(
      make(
        "p",
        "Private records appear here after the database is connected.",
        "small-note",
      ),
    );
    return;
  }
  if (!["owner", "editor"].includes(staff?.role)) return;
  const { data, error } = await client
    .from("urc_donations")
    .select(
      "id,amount_minor,currency,method,status,reference,recorded_at,recorded_by",
    )
    .order("recorded_at", { ascending: false })
    .limit(25);
  if (error) {
    root.append(
      make(
        "p",
        "Donation records could not load. Please try again.",
        "small-note",
      ),
    );
    return;
  }
  const { data: people } = await client
    .from("urc_team")
    .select("user_id,display_name");
  const names = new Map(
    (people ?? []).map((person) => [person.user_id, person.display_name]),
  );
  await donationTotals();
  for (const donation of data ?? []) {
    const row = make("div", undefined, "donation-record"),
      text = make("div");
    text.append(
      make(
        "strong",
        `${donation.currency} ${(donation.amount_minor / 100).toFixed(2)} · ${donation.method === "cash" ? "Cash" : "EcoCash"}`,
      ),
      make(
        "small",
        `${donation.status === "pending" ? "Needs verification" : "Confirmed"}${donation.reference ? " · " + donation.reference : ""}`,
      ),
    );
    text.append(
      make(
        "small",
        (names.get(donation.recorded_by) || "Team member") +
          " · " +
          new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Africa/Harare",
          }).format(new Date(donation.recorded_at)) +
          " CAT",
      ),
    );
    row.append(text);
    if (
      staff.role === "owner" &&
      donation.status === "pending" &&
      donation.method === "ecocash"
    ) {
      const button = make("button", "Confirm verified transfer");
      button.addEventListener("click", async () => {
        if (
          !confirm(
            "Have you matched this reference and amount against the merchant’s EcoCash transaction record?",
          )
        )
          return;
        button.disabled = true;
        const { error } = await client.rpc("urc_confirm_ecocash", {
          donation: donation.id,
        });
        if (error) {
          toast("The verification could not be saved. Try again.");
          button.disabled = false;
        } else loadDonations();
      });
      row.append(button);
    }
    root.append(row);
  }
  if (!data?.length)
    root.append(make("p", "No donation records yet.", "small-note"));
}

$("#password-setup").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("button", event.currentTarget);
  button.disabled = true;
  try {
    const { error } = await client.auth.updateUser({
      password: $("#new-password").value,
    });
    if (error)
      throw Error(
        "The password could not be saved. Use at least 12 characters and try again.",
      );
    $("#new-password").value = "";
    await workspace();
  } catch (error) {
    $("#login-message").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
$("#back-team").addEventListener("click", () => {
  $("#team-link").value = "";
  $("#team-link-panel").hidden = true;
  show("studio-home");
});
$("#team-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (preview) return;
  const button = $("button", event.currentTarget);
  button.disabled = true;
  $("#team-link-panel").hidden = true;
  try {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) throw Error("Sign in again to manage team access.");
    const response = await fetch("/api/studio/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      }),
      data = await response.json();
    if (!response.ok)
      throw Error(data.error || "A setup link could not be created.");
    $("#team-link").value = new URL(data.setupPath, location.origin).href;
    $("#team-link-panel").hidden = false;
    $("#team-result").textContent =
      "Setup link created. Share it privately with this teammate.";
  } catch (error) {
    $("#team-result").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
$("#copy-team-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#team-link").value);
    $("#team-result").textContent = "Private link copied.";
  } catch {
    $("#team-link").select();
    $("#team-result").textContent = "Select and copy the link above.";
  }
});
let cameraStream = null,
  scanFrame = null;
function stopCamera() {
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = null;
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  const box = $("#scanner");
  if (box) box.hidden = true;
}
$("#stop-scan").addEventListener("click", stopCamera);
$("#scan-pass").addEventListener("click", async () => {
  if (preview) {
    $("#checkin-result").textContent =
      "Camera check-in is available to the signed-in event team after setup.";
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    $("#scanner").hidden = false;
    const video = $("#scanner-video");
    video.srcObject = cameraStream;
    await video.play();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let last = 0;
    function scan(time) {
      if (!cameraStream) return;
      if (video.readyState >= 2 && time - last > 200) {
        last = time;
        canvas.width = Math.min(video.videoWidth, 800);
        canvas.height = Math.round(
          (video.videoHeight * canvas.width) / video.videoWidth,
        );
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height),
          code = jsQR(image.data, canvas.width, canvas.height, {
            inversionAttempts: "dontInvert",
          });
        if (code) {
          try {
            const url = new URL(code.data);
            if (
              url.origin === location.origin &&
              url.pathname === "/pass" &&
              /^[A-Za-z0-9_-]{43}$/.test(url.hash.slice(1))
            ) {
              $("#pass-reference").value = url.href;
              stopCamera();
              $("#checkin-form").requestSubmit();
              return;
            }
          } catch {}
        }
      }
      scanFrame = requestAnimationFrame(scan);
    }
    scanFrame = requestAnimationFrame(scan);
  } catch {
    stopCamera();
    $("#checkin-result").textContent =
      "The camera could not open. Allow camera access, or enter the pass code below.";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
});
window.addEventListener("pagehide", stopCamera);

let summaryRows = [];
async function donationTotals() {
  const root = $("#donation-totals");
  root.replaceChildren();
  $("#export-donations").hidden = true;
  if (staff.role !== "owner") return;
  const { data, error } = await client.rpc("urc_donation_summary");
  if (error) {
    root.append(
      make("p", "Totals could not be loaded. Refresh before reconciling."),
    );
    return;
  }
  summaryRows = data ?? [];
  for (const item of summaryRows) {
    const text = make("p");
    text.append(
      make(
        "strong",
        `${item.currency} ${(Number(item.amount_minor) / 100).toFixed(2)}`,
      ),
      document.createTextNode(
        ` · ${item.event_title || "Event"} · ${item.method} · ${item.status === "pending" ? "Needs verification" : item.status} · ${item.gifts} gift${Number(item.gifts) === 1 ? "" : "s"}`,
      ),
    );
    root.append(text);
  }
  $("#export-donations").hidden = !summaryRows.length;
}
$("#export-donations").addEventListener("click", () => {
  if (staff.role !== "owner") return;
  const cell = (value) =>
    '"' +
    String(value ?? "")
      .replace(/^[=+\-@\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const records = [
    ["Event", "Currency", "Method", "Status", "Amount", "Gifts"],
    ...summaryRows.map((row) => [
      row.event_title,
      row.currency,
      row.method,
      row.status,
      (Number(row.amount_minor) / 100).toFixed(2),
      row.gifts,
    ]),
  ];
  const url = URL.createObjectURL(
      new Blob([records.map((row) => row.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    ),
    a = make("a");
  a.href = url;
  a.download =
    "urc-reconciliation-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function openTeam() {
  show("team-setup");
  const root = $("#team-members");
  root.replaceChildren();
  if (staff.role !== "owner") return;
  const { data, error } = await client
    .from("urc_team")
    .select("user_id,display_name,role")
    .order("created_at");
  if (error) {
    root.append(make("p", "The team list could not load. Try again."));
    return;
  }
  for (const member of data ?? []) {
    const row = make("div", undefined, "donation-record");
    row.append(make("strong", member.display_name + " · " + member.role));
    if (member.role !== "owner") {
      const button = make("button", "Remove access");
      button.addEventListener("click", async () => {
        if (
          !confirm("Remove " + member.display_name + "’s access to URC Studio?")
        )
          return;
        button.disabled = true;
        try {
          const {
            data: { session },
          } = await client.auth.getSession();
          if (!session) throw Error("Sign in again.");
          const response = await fetch("/api/studio/invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + session.access_token,
            },
            body: JSON.stringify({ action: "revoke", userId: member.user_id }),
          });
          if (!response.ok)
            throw Error("Access could not be removed. Try again.");
          toast("Team access removed.");
          await openTeam();
        } catch (error) {
          toast(error.message);
          button.disabled = false;
        }
      });
      row.append(button);
    }
    root.append(row);
  }
}

init();
