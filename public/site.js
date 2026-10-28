import { galleryHighlights } from "../lib/gallery.js";
import { mountRaceWorld } from "./race-world.js";
import {
  homeExperience,
  eventExperience,
  raceCard,
  runFeature,
} from "./experience.js";
import { mountReservation } from "./reservation.js";
import {
  renderCommunity,
  renderMemberSettings,
  attachFollow,
} from "./network.js";
import { createClient } from "@supabase/supabase-js";
import {
  eventState,
  activityOptions,
  estimatedMinutes,
  safeUrl,
  escapeHtml as e,
} from "../lib/public.js";
const $ = (q, r = document) => r.querySelector(q),
  $$ = (q, r = document) => [...r.querySelectorAll(q)];
const main = $("#main"),
  page = document.body.dataset.page;
const slug = decodeURIComponent(
  location.pathname.split("/").filter(Boolean)[1] ?? "",
);
let entries = [],
  club = {},
  photos = [],
  photoIndex = 0,
  client = null,
  member = null;
const kindRoute = {
  event: "events",
  album: "gallery",
  partner: "partners",
  recap: "impact",
};
const path = (x) => `/${kindRoute[x.kind]}/${encodeURIComponent(x.slug)}`;
const date = (value) =>
  Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Harare",
      }).format(new Date(value)) + " CAT"
    : "Details to be confirmed";
const button = (label, url, cls = "") =>
  `<a class="button ${cls}" href="${e(url)}">${e(label)} <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a>`;
const intro = (title, body, back = "") => {
  const covers = {
    events: [
      "/assets/urc-moment-3.jpg",
      "The URC community together before a run",
    ],
    gallery: ["/assets/urc-moment-1.jpg", "URC members in Harare"],
    club: ["/assets/urc-moment-3.jpg", "The Powerhouse running community"],
    partners: ["/assets/urc-moment-4.jpg", "Members of the URC community"],
    shop: ["/assets/urc-moment-3.jpg", "The URC community wearing club shirts"],
    "first-run": ["/assets/urc-moment-2.jpg", "Members of the URC community"],
  };
  const cover = !back && covers[page];
  if (
    cover &&
    ["events", "gallery", "club", "partners", "shop", "first-run"].includes(page)
  ) {
    const labels = {
      events: "Runs",
      gallery: "Gallery",
      club: "The club",
      partners: "Partners",
      shop: "Shop",
      "first-run": "Your first run",
    };
    return `<header class="runs-cover shared-masthead"><img src="${cover[0]}" alt="${cover[1]}" fetchpriority="high"><div class="runs-cover-shade"></div><h1>${labels[page]}</h1><div class="runs-diagonal" aria-hidden="true"></div></header>`;
  }
  return `<header class="page-intro ${cover ? "race-page-intro" : ""}">${cover ? `<img class="race-page-cover" src="${cover[0]}" alt="${cover[1]}" fetchpriority="high"><div class="race-page-shade"></div><span class="race-page-location">POWERHOUSE / HARARE, ZIMBABWE</span>` : ""}${back ? `<a class="back" href="/${page}">← ${e(back)}</a>` : ""}<div class="page-intro-line"><h1>${e(title)}</h1><p>${e(body)}</p></div></header>`;
};
const empty = (title, body, url = "/first-run", label = "Your first run") =>
  `<div class="empty-state"><h2>${e(title)}</h2><p>${e(body)}</p>${button(label, url, "outline")}</div>`;
function toast(text) {
  $("#site-toast").textContent = text;
  $("#site-toast").hidden = false;
  setTimeout(() => ($("#site-toast").hidden = true), 4200);
}
// Shared by the private profile/pass exports, independent of the removed event action bar.
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function saved() {
  try {
    return JSON.parse(localStorage.getItem("urc_saved_runs_v1") ?? "[]")
      .filter((x) => typeof x === "string")
      .slice(0, 100);
  } catch {
    return [];
  }
}
function saveRun(id) {
  const ids = new Set(saved());
  ids.has(id) ? ids.delete(id) : ids.add(id);
  try {
    localStorage.setItem("urc_saved_runs_v1", JSON.stringify([...ids]));
  } catch {
    toast("Your browser could not save this run.");
    return;
  }
  toast(
    ids.has(id) ? "Run saved on this device." : "Run removed from saved runs.",
  );
  $$(`[data-save="${CSS.escape(id)}"]`).forEach((b) => {
    b.textContent = ids.has(id) ? "Saved ✓" : "Save this run";
    b.setAttribute("aria-pressed", String(ids.has(id)));
  });
}
function card(x) {
  if (x.kind === "event")
    return `<div class="entry-race">${raceCard(x, { formatDate: date, past: eventState(x) === "past" })}</div>`;
  const p = x.payload ?? {},
    image = safeUrl(p.coverUrl);
  return `<article class="entry-card"><a href="${path(x)}"><div class="entry-art">${image ? `<img class="${x.kind === "partner" ? "partner-logo" : ""}" src="${e(image)}" alt="${e(p.coverAlt || x.title)}" loading="lazy">` : '<span class="poster-mark" aria-hidden="true">U<i>R</i>C</span>'}</div><div class="entry-meta">${e(x.kind === "event" ? date(p.startsAt) : p.partnerType || p.category || "URC / HARARE")}</div><h2>${e(x.title)}</h2><p>${e(p.summary || p.purpose || p.contribution || "")}</p><span class="entry-action">${x.kind === "album" ? "Open album" : x.kind === "event" ? "View run" : "Read the story"} ↗</span></a></article>`;
}
function related(x) {
  const ids = (x.payload?.partnerIds ?? "").split(",").map((v) => v.trim());
  return entries.filter(
    (y) =>
      y.id !== x.id &&
      (y.payload?.eventId === x.id ||
        x.payload?.eventId === y.id ||
        ids.includes(y.id) ||
        y.payload?.relatedEventIds
          ?.split(",")
          .map((v) => v.trim())
          .includes(x.id)),
  );
}
function linkRelated(x) {
  return `<nav class="related-links" aria-label="Related stories">${related(x)
    .map((y) => `<a href="${path(y)}">${e(y.title)} ↗</a>`)
    .join(
      "",
    )}<a href="/${page}">← All ${page === "events" ? "runs" : e(page)}</a></nav>`;
}
function home() {
  const events = entries
      .filter((x) => x.kind === "event" && eventState(x) === "upcoming")
      .sort(
        (a, b) =>
          Date.parse(a.payload.startsAt) - Date.parse(b.payload.startsAt),
      ),
    next = events[0],
    albums = entries.filter((x) => x.kind === "album"),
    settings =
      entries.find(
        (x) => x.kind === "page" && x.slug === "homepage-introduction",
      )?.payload ?? {};
  main.innerHTML = homeExperience({
    next,
    events,
    albums,
    settings,
    formatDate: date,
  });
  mountRaceWorld();
}

function runsPage() {
  const events = entries
    .filter((x) => x.kind === "event" && eventState(x) === "upcoming")
    .sort(
      (a, b) => Date.parse(a.payload.startsAt) - Date.parse(b.payload.startsAt),
    );
  main.innerHTML =
    intro("Runs", "") +
    `<section class="runs-tradition"><div class="runs-tradition-photo"><img src="/assets/urc-moment-3.jpg" alt="Urban Run Community together in Harare" loading="lazy"></div><div class="runs-tradition-copy"><h2>Powerhouse.<br>On foot.</h2><p>We meet in Harare, run together and make a morning of it.</p><p>Each run has its own plan: a cause to support, a local collaboration, something to do after the finish. Pick the one that feels like your kind of day.</p><a class="race-text-link" href="/club">Meet the club ↗</a></div></section><section class="run-feature-list" aria-label="Upcoming runs">${events.length ? events.map(runFeature).join("") : "<p>The next run is being planned. Confirmed details will appear here.</p>"}</section>`;
}
function galleryPage() {
  const albums = entries.filter((x) => x.kind === "album").sort((a,b) => Date.parse(b.payload?.galleryDate || b.updatedAt || 0) - Date.parse(a.payload?.galleryDate || a.updatedAt || 0));
  const first = albums[0], images = galleryHighlights(albums);
  const website = entries.find(x => x.kind === "page" && x.slug === "homepage-introduction")?.payload || {};
  const browseUrl = safeUrl(website.galleryDriveUrl) || (first ? "/gallery/" + encodeURIComponent(first.slug) : "/gallery");
  main.innerHTML =
    intro("Gallery", "") +
    (first
      ? `<section class="editorial-photo-row gallery-official"><img src="${e(safeUrl(first.payload.coverUrl) || "/assets/urc-moment-1.jpg")}" alt="URC community photograph" loading="lazy"><div><h2>Official photos</h2><p>From the start to everything after. Photographs from the URC community.</p><a class="race-text-link" href="${e(browseUrl)}">Browse the photos <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a></div></section><section class="gallery-more"><header class="ref-section-heading"><div class="ref-section-ghost" aria-hidden="true">MORE PHOTOS</div><h2>More photos</h2></header><div class="race-photo-strip">${images.map((im) => `<a href="/gallery/${e(encodeURIComponent(im.album.slug))}#photo-${im.index + 1}"><img src="${e(safeUrl(im.url))}" alt="${e(im.alt || "URC community photograph")}" loading="lazy"><span class="camera-image-title">${e(im.caption || "Powerhouse")}</span></a>`).join("")}</div></section>`
      : '<section class="section"><h2>Photos coming soon.</h2><a class="race-text-link" href="/events">See the runs ↗</a></section>');
}
function partnersPage() {
  const partners = entries.filter((x) => x.kind === "partner");
  main.innerHTML =
    intro("Partners", "") +
    `<section class="editorial-photo-row"><img src="/assets/urc-moment-4.jpg" alt="URC members together in Harare" loading="lazy"><div><h2>Local people.<br>Good collaborations.</h2><p>A place to meet. Something to eat. Time to recover after the run. There are different ways to be part of a URC morning.</p><a class="race-text-link" href="/contact?topic=partnership">Talk to the team <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a></div></section>${partners.length ? `<section class="section"><div class="listing">${partners.map(card).join("")}</div></section>` : ""}`;
}
function directory() {
  if (page === "events") return runsPage();
  if (page === "gallery") return galleryPage();
  if (page === "partners") return partnersPage();
  const stories = entries.filter((x) => x.kind === "recap");
  main.innerHTML =
    intro(
      "A reason to run.",
      "Stories from the runs and the causes behind them.",
    ) +
    `<section class="section">${stories.length ? `<div class="listing">${stories.map(card).join("")}</div>` : "<p>Stories from our runs will appear here.</p>"}</section>`;
}

function sectionBlock(title, text) {
  return text ? `<section><h2>${e(title)}</h2><p>${e(text)}</p></section>` : "";
}
function detail(x) {
  const p = x.payload ?? {};
  document.title = x.title + " · URC";
  main.innerHTML =
    x.kind === "event"
      ? ""
      : intro(
          x.title,
          x.kind === "event"
            ? date(p.startsAt)
            : p.summary || p.contribution || "",
          page === "events" ? "All runs" : `All ${page}`,
        );
  if (x.kind === "event") {
    const state = eventState(x),
      theme = ["lime", "rose", "ice"].includes(p.theme) ? p.theme : "lime";
    main.insertAdjacentHTML(
      "beforeend",
      eventExperience(x, {
        state,
        formatDate: date,
        saved: saved().includes(x.id),
        related: linkRelated(x),
      }),
    );
    $(".event-world").style.setProperty(
      "--event-color",
      { ice: "#c4def0", rose: "#efc8c2", lime: "#c6e7a5" }[theme],
    );
    $("#load-venue-map").addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.title = "Event meeting point: " + p.location;
      frame.src =
        "https://maps.google.com/maps?q=" +
        encodeURIComponent(p.location + ", Zimbabwe") +
        "&z=15&output=embed";
      frame.referrerPolicy = "no-referrer";
      frame.loading = "lazy";
      const target = $("#venue-map-frame");
      target.append(frame);
      target.hidden = false;
      $(".map-consent").hidden = true;
      if ($(".map-grid")) $(".map-grid").hidden = true;
    });
    if (
      state === "upcoming" &&
      p.registration === "open" &&
      (!p.registrationClosesAt ||
        Date.parse(p.registrationClosesAt) > Date.now())
    ) {
      if (["free-pass", "urc-pending"].includes(p.registrationMode))
        mountReservation($("#registration-form"), x);
      else if (safeUrl(p.joinUrl))
        $("#registration-form").innerHTML = button(
          "Register for this run",
          safeUrl(p.joinUrl),
        );
    } else
      $("#registration-form").innerHTML =
        `<p class="notice">${e(p.statusNote || "Registration is not open for this event.")}</p>${p.waitlist === "yes" && state === "upcoming" ? '<div id="waitlist-form"></div>' : ""}`;
    const otherRuns = entries
      .filter((y) => y.kind === "event" && eventState(y) === "upcoming")
      .sort(
        (a, b) =>
          Date.parse(a.payload.startsAt) - Date.parse(b.payload.startsAt),
      );
    const runIndex = otherRuns.findIndex((y) => y.id === x.id);
    for (const [selector, offset] of [
      ['[aria-label="Previous run"]', -1],
      ['[aria-label="Next run"]', 1],
    ]) {
      const neighbour = runIndex >= 0 ? otherRuns[runIndex + offset] : null;
      const control = $(selector);
      if (neighbour && control) {
        control.disabled = false;
        control.addEventListener("click", () =>
          location.assign(path(neighbour)),
        );
      }
    }
    if ($("#waitlist-form")) requestForm($("#waitlist-form"), "waitlist", x.id);
    if ($("#feedback-form")) requestForm($("#feedback-form"), "feedback", x.id);
  } else if (x.kind === "album") {
    photos = (p.photos ?? []).filter((y) => safeUrl(y.url));
    main.insertAdjacentHTML(
      "beforeend",
      `<section class="section"><div class="section-head"><p>${e(p.photographer ? "Photography by " + p.photographer : "Photographer credits are included with individual photographs where supplied.")}</p><button class="text-link" id="album-share">Share album ↗</button></div><div class="gallery-grid">${photos.map((photo, i) => `<button class="gallery-photo" data-photo="${i}" aria-label="View photo ${i + 1}"><img src="${e(safeUrl(photo.url))}" alt="${e(photo.alt || photo.caption || `${x.title}, photo ${i + 1}`)}" loading="lazy">${photo.caption ? `<span>${e(photo.caption)}</span>` : ""}</button>`).join("")}</div><p class="image-credit">${e(p.credit || "")} <a class="text-link" href="/contact?topic=photo-removal">Request a photo removal</a></p>${linkRelated(x)}</section>`,
    );
    $$("[data-photo]").forEach((b) =>
      b.addEventListener("click", () => openPhoto(Number(b.dataset.photo))),
    );
    $("#album-share").addEventListener("click", () => share(x));
  } else {
    main.insertAdjacentHTML(
      "beforeend",
      `<section class="section"><div class="editorial-copy"><div>${p.coverUrl ? `<img src="${e(safeUrl(p.coverUrl))}" alt="${e(x.title)}" class="${x.kind === "partner" ? "partner-logo" : ""}">` : `<h2>${x.kind === "recap" ? "The story of the day." : "Part of the community."}</h2>`}</div><div>${x.kind === "partner" ? sectionBlock("Their contribution.", p.contribution) + sectionBlock("How the collaboration works.", p.summary || p.relatedEvents) : sectionBlock("The story.", p.summary) + sectionBlock("Confirmed impact.", p.verifiedImpact) + sectionBlock("Beneficiary.", p.beneficiary) + sectionBlock("Report and transfer details.", p.reportDetails)}${x.kind === "partner" ? '<button class="text-link" id="follow-partner">Follow collaborator</button>' : ""}${safeUrl(p.url) ? `<a class="text-link" target="_blank" rel="noopener noreferrer" href="${e(safeUrl(p.url))}">Visit ${e(x.title)} ↗</a>` : ""}</div></div>${linkRelated(x)}</section>`,
    );
    if (x.kind === "partner")
      void attachFollow($("#follow-partner"), "partner", x.id, toast);
  }
}
function clubPage() {
  const settings = entries.find(
    (x) => x.kind === "page" && x.slug === "the-club",
  )?.payload;
  main.innerHTML =
    intro("The club", "") +
    `<section class="editorial-photo-row"><img src="/assets/urc-moment-1.jpg" alt="URC members together in Harare" loading="lazy"><div><h2>A lifestyle<br>in motion.</h2><p>${e(settings?.summary || "Powerhouse Urban Run Club is where people in Harare get together to run, catch up and spend a morning outside.")}</p><p>We usually meet for one or two runs a month. Each day has its own plan, its own people and a reason to get out together.</p><a class="race-text-link" href="/events">Find your run <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a></div></section><section class="editorial-photo-row photo-row-reverse photo-row-muted"><img src="/assets/urc-moment-2.jpg" alt="URC members at Mind Over Miles" loading="lazy"><div><h2>A familiar face.<br>A place to belong.</h2><p>You don’t need to know everyone before you get here. Come on your own, bring a friend and find your pace. The faces get familiar.</p><a class="race-text-link" href="/gallery">Inside the gallery <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a></div></section><section class="club-around"><h2>The run is<br>part of the day.</h2><nav aria-label="Around Powerhouse"><a href="/partners">Local collaborations <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a><a href="/gallery">The people and moments <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a></nav></section><section class="editorial-photo-row photo-row-dark"><img src="/assets/urc-moment-4.jpg" alt="Members of the URC community" loading="lazy"><div><h2>Built by<br>the community.</h2><p>Help at a run, photograph a morning or bring something to the next collaboration. There’s more than one way to be involved.</p><a class="race-text-link" href="/contact?topic=volunteer">Get involved <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a></div></section>`;
}

function firstRun() {
  const steps = [
    [
      "Choose your activity",
      "Check the event’s distances, pace guidance and accessibility information. Walking options appear when confirmed.",
    ],
    [
      "Register and keep your pass",
      "Save your private pass link and download the PDF before the event. You can participate without making a donation.",
    ],
    [
      "Pack the basics",
      "Bring comfortable running shoes, water and suitable layers. Follow any additional event-specific checklist.",
    ],
    [
      "Know where to meet",
      "Check the meeting pin and arrival instructions. Allow time to find the organisers and hear the briefing.",
    ],
    [
      "Ask for help when you need it",
      "Tell a run lead if you are unsure about the route, pace or how you are feeling.",
    ],
  ];
  main.innerHTML =
    intro(
      "Your first run.",
      "You can arrive on your own. Here’s what to know before you do.",
    ) +
    `<section class="section first-run-scenes"><div class="section-head"><h2>A little look<br>at your morning.</h2><p>Your run starts before the starting line.</p></div><div class="first-run-photo-cards"><article><img src="/assets/urc-moment-1.jpg" alt="The URC community outside in Harare" loading="lazy"><span>FIND THE PEOPLE</span><h3>Meet us there.</h3></article><article><img src="/assets/urc-moment-4.jpg" alt="URC members together before a run" loading="lazy"><span>FIND YOUR RHYTHM</span><h3>Take your time.</h3></article><article><img src="/assets/urc-moment-5.jpg" alt="A smiling member of the URC community" loading="lazy"><span>MAKE A MORNING OF IT</span><h3>Stay a while.</h3></article></div></section><section class="section guide-grid"><h2>A little preparation.<br>A simpler start.</h2><div><ul class="checklist">${steps.map(([title, body], i) => `<li><label><input type="checkbox" data-checklist="${i}"><span>${e(title)}</span></label><p>${e(body)}</p></li>`).join("")}</ul><p class="image-credit">Your checklist is kept on this device.</p>${button("See upcoming runs", "/events")}</div></section><section class="section green-panel editorial-copy"><h2>Choose a pace<br>you can enjoy.</h2><div><p>For an easy social effort, you should be able to speak in sentences. The event details explain what activities are available; a run lead can help you choose on the day.</p><p>This is general guidance, not a fitness assessment. Choose what suits your health and experience.</p></div></section><section class="section prose faq"><h2>A few good questions.</h2>${[
      [
        "Do I have to be fast?",
        "Look for the activity and pace that suit you. Each confirmed event lists its options. Ask the organiser if you are uncertain.",
      ],
      [
        "Can I come alone?",
        "Yes. Arrive in time for the briefing and introduce yourself to a run lead.",
      ],
      [
        "Do I have to donate?",
        "No. Attendance is free and giving is always optional. Your pass does not display donation information.",
      ],
      [
        "What if the plans change?",
        "Check the event page and your pass page before travelling. Cancellation and postponement updates appear there.",
      ],
      [
        "Will there be photographs?",
        "Where event photography is planned, the organisers should explain it. You can contact URC about a photograph or request its removal.",
      ],
    ]
      .map(
        ([q, a]) =>
          `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`,
      )
      .join("")}</section>`;
  $(".green-panel", main).insertAdjacentHTML(
    "afterend",
    `<section class="section editorial-copy"><h2>Plan your time<br>on the route.</h2><form class="simple-form" id="pace-planner"><label>Distance in kilometres<input name="distance" type="number" min="0.1" max="100" step="0.1" value="5" required></label><label>Your pace in minutes per kilometre<input name="pace" type="number" min="2" max="30" step="0.1" value="7" required></label><output aria-live="polite" id="pace-result"></output><p>This is a time estimate at a steady pace, excluding stops. It does not assess fitness or confirm the event’s route.</p></form></section>`,
  );
  const planner = $("#pace-planner");
  const updatePace = () => {
    const minutes = estimatedMinutes(
      planner.elements.distance.value,
      planner.elements.pace.value,
    );
    $("#pace-result").textContent =
      minutes === null
        ? "Enter a valid distance and pace."
        : `Around ${Math.floor(minutes / 60) ? Math.floor(minutes / 60) + " hr " : ""}${minutes % 60} min on the route.`;
  };
  planner.addEventListener("input", updatePace);
  planner.addEventListener("submit", (event) => event.preventDefault());
  updatePace();
  $$("[data-checklist]").forEach((input) => {
    try {
      input.checked =
        localStorage.getItem("urc_checklist_" + input.dataset.checklist) ===
        "yes";
    } catch {}
    input.addEventListener("change", () => {
      try {
        localStorage.setItem(
          "urc_checklist_" + input.dataset.checklist,
          input.checked ? "yes" : "no",
        );
      } catch {}
    });
  });
}
function requestForm(target, type = "contact", eventId = "") {
  target.innerHTML = `<form class="simple-form" data-request><label>Your name<input name="name" autocomplete="name" maxlength="80" required></label><label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" required></label>${type === "contact" ? `<label>What would you like to discuss?<select name="topic">${["general", "partnership", "volunteer", "photo-removal", "media", "privacy"].map((v) => `<option value="${v}">${e(v.replace("-", " "))}</option>`).join("")}</select></label>` : ""}<label>${type === "feedback" ? "Your feedback" : type === "waitlist" ? "Activity and anything we should know" : "Your message"}<textarea name="message" maxlength="3000" ${type === "waitlist" ? "" : "required"}></textarea></label><label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>${type === "waitlist" ? "<p>Joining this list is not a confirmed registration. An organiser will contact you if a place becomes available.</p>" : ""}<p>Your details are shared with the URC organisers for this request. They are not a marketing signup.</p><button class="button" type="submit">${type === "waitlist" ? "Join the waiting list" : type === "feedback" ? "Send feedback" : "Send to the team"} →</button><p role="status"></p></form>`;
  const form = $("form", target);
  const topic = new URLSearchParams(location.search).get("topic");
  if (
    form.elements.topic &&
    [...form.elements.topic.options].some((o) => o.value === topic)
  )
    form.elements.topic.value = topic;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const b = $("button[type=submit]", form),
      status = $("[role=status]", form);
    b.disabled = true;
    status.textContent = "Sending…";
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          type,
          eventId,
          ...Object.fromEntries(new FormData(form)),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Your request could not be sent.");
      form.reset();
      status.textContent =
        type === "waitlist"
          ? "Your request is saved. A place is not confirmed yet."
          : "Your message is saved for the URC team.";
    } catch (err) {
      status.textContent = err.message;
    } finally {
      b.disabled = false;
    }
  });
}
function contactPage() {
  main.innerHTML =
    intro(
      "Let’s talk.",
      "Runs, collaborations, volunteering, photography or something we should know.",
    ) +
    `<section class="section form-layout"><div><h2>A direct line<br>to the team.</h2><p class="form-note">For an event-day question, use the organiser details on that event’s page.</p>${club.contactEmail ? `<a class="text-link" href="mailto:${e(club.contactEmail)}">${e(club.contactEmail)}</a>` : ""}<div class="related-links"><a href="/partners">Partnerships ↗</a><a href="/privacy">Your information ↗</a></div></div><div id="contact-form"></div></section>`;
  requestForm($("#contact-form"));
}
function joinPage() {
  main.innerHTML =
    intro(
      "Your place<br>is out there.".replace("<br>", " "),
      "Find a run, get to know the club and become part of the community.",
    ) +
    `<section class="section editorial-copy"><h2>Start with<br>the next run.</h2><div><p>Choose an event that suits you and register directly from its page. A membership account is optional.</p><div class="detail-actions">${button("Explore the runs", "/events")}${button("Your first run", "/first-run", "outline")}</div>${safeUrl(club.joinUrl) ? `<p class="form-note">The club’s confirmed community channel:</p>${button("Join the community", safeUrl(club.joinUrl), "green")}` : '<p class="notice">The club’s community invitation link will appear here once the organisers confirm it.</p>'}</div></section><section class="section"><div class="section-head"><h2>Follow along.</h2></div><div class="related-links">${safeUrl(club.instagramUrl) ? `<a href="${e(safeUrl(club.instagramUrl))}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>` : ""}${safeUrl(club.stravaUrl) ? `<a href="${e(safeUrl(club.stravaUrl))}" target="_blank" rel="noopener noreferrer">Strava ↗</a>` : ""}<a href="/gallery">Explore the gallery ↗</a><a href="/contact?topic=volunteer">Volunteer ↗</a></div></section>`;
}
function shopPage() {
  main.innerHTML =
    intro("Shop", "") +
    `<section class="editorial-photo-row"><img src="/assets/urc-moment-3.jpg" alt="The URC community wearing club shirts" loading="lazy"><div><h2>URC, beyond<br>the run.</h2><p>Club pieces and local collaborations will live here.</p><p>Merchandise isn’t available to order online yet. Ask the team about availability.</p><a class="race-text-link" href="/contact?topic=general">Ask about merchandise <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a></div></section>`;
}

function privacy() {
  main.innerHTML =
    intro(
      "Your information.",
      "Practical information for taking part, contacting the team and sharing the road.",
    ) +
    `<article class="section prose"><h2>Registering for a run</h2><p>Your name and chosen activity help organisers manage attendance. Email and phone are optional in the free-pass form. Your private pass link acts as its access credential; keep it safe.</p><h2>Giving is separate</h2><p>Attendance is free. Donation records are private to authorised team roles and are not displayed on your pass or publicly connected to your participation.</p><h2>Photographs</h2><p>Published albums may include event photography. Ask the organisers about photography before taking part. For a photo removal request, include the album link and enough information to identify the photograph.</p><a class="text-link" href="/contact?topic=photo-removal">Request a photo removal ↗</a><h2>Account and device preferences</h2><p>Saved runs and your first-run checklist are stored on this device. They are not advertising profiles. A member account is optional; its private settings are accessible only to that account through database permissions.</p><h2>Questions and requests</h2><p>Contact the team for corrections, deletion requests or questions about your information. The club needs to confirm its controller contact and retention policy before opening public registration.</p><a class="text-link" href="/contact?topic=privacy">Contact the team about privacy ↗</a><h2>Taking part</h2><p>Read the specific event’s distance, pace, accessibility and cancellation information. Choose an activity suitable for your circumstances, follow the organiser’s briefing and seek professional guidance where appropriate.</p></article>`;
}
async function account() {
  main.innerHTML =
    intro(
      "Your URC.",
      "Saved runs, your member profile and the next time you’re heading out.",
    ) +
    `<section class="section account-grid"><div><h2>Saved on this device.</h2><ul class="saved-list">${entries
      .filter((x) => x.kind === "event" && saved().includes(x.id))
      .map(
        (x) =>
          `<li><a href="${path(x)}">${e(x.title)}</a><button data-remove="${e(x.id)}">Remove</button></li>`,
      )
      .join(
        "",
      )}</ul>${saved().length ? "" : '<p class="form-note">Save a run from its event page to find it here.</p>'}<a class="text-link" href="/events">Explore the runs ↗</a><h2>Already registered?</h2><p class="form-note">Open the private pass link you received after registering. You can download the PDF again or manage that registration from the pass page.</p></div><div id="member-account"><p role="status">Checking member sign-in…</p></div></section>`;
  $$("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      saveRun(b.dataset.remove);
      b.closest("li").remove();
    }),
  );
  try {
    const r = await fetch("/api/studio/config");
    const config = await r.json();
    if (!config.configured) {
      $("#member-account").innerHTML =
        '<h2>Member accounts.</h2><p class="notice">Account sign-in is not connected yet. You can browse, save runs on this device and register for an open event without a member account.</p>';
      return;
    }
    client = createClient(config.url, config.publishableKey, {
      auth: { flowType: "pkce" },
    });
    const {
      data: { user },
    } = await client.auth.getUser();
    member = user;
    if (user) await memberSettings();
    else memberLogin();
  } catch {
    $("#member-account").innerHTML =
      '<p role="alert">Member sign-in could not load. Try refreshing this page.</p>';
  }
}
function memberLogin() {
  const root = $("#member-account");
  let mode = "in";
  function render() {
    root.innerHTML = `<h2>${mode === "in" ? "Member sign-in." : "Create your URC account."}</h2><form class="simple-form"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="${mode === "in" ? "current-password" : "new-password"}" ${mode === "up" ? 'minlength="12"' : ""} required></label><button class="button" type="submit">${mode === "in" ? "Sign in" : "Create account"} →</button><p role="status"></p><p>${mode === "up" ? "Use at least 12 characters. You may need to confirm your email before signing in." : "Guest registration remains available without a member account."}</p></form><button class="text-link" id="member-mode">${mode === "in" ? "New here? Create an account" : "I already have an account"}</button>`;
    $("#member-mode").onclick = () => {
      mode = mode === "in" ? "up" : "in";
      render();
    };
    const form = $("form", root);
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      $("button", form).disabled = true;
      const credentials = {
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
      };
      const { data, error } =
        mode === "in"
          ? await client.auth.signInWithPassword(credentials)
          : await client.auth.signUp({
              ...credentials,
              options: {
                emailRedirectTo: new URL("/account", location.origin).href,
              },
            });
      if (error) {
        $("[role=status]", form).textContent =
          "Account access could not finish. Check your details or contact the organisers if account creation is not open.";
        $("button", form).disabled = false;
      } else if (!data.session) {
        $("[role=status]", form).textContent =
          "Check your email for confirmation, then return here to sign in.";
        $("button", form).disabled = false;
      } else {
        member = data.user;
        await memberSettings();
      }
    });
  }
  render();
}
async function memberSettings() {
  await renderMemberSettings({
    root: $("#member-account"),
    client,
    member,
    download,
    onSignOut: async () => {
      await client.auth.signOut();
      member = null;
      memberLogin();
    },
  });
}
async function share(x) {
  const url = new URL(path(x), location.origin).href;
  try {
    if (navigator.share) await navigator.share({ title: x.title, url });
    else {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    }
  } catch (err) {
    if (err.name !== "AbortError")
      toast("Copy this page’s address to share it.");
  }
}
function openPhoto(i) {
  if (!photos.length) return;
  photoIndex = (i + photos.length) % photos.length;
  const photo = photos[photoIndex];
  $("#viewer-image").src = safeUrl(photo.url);
  $("#viewer-image").alt =
    photo.alt || photo.caption || `Photo ${photoIndex + 1}`;
  $("#viewer-caption").textContent = [photo.caption, photo.credit]
    .filter(Boolean)
    .join(" · ");
  $("#photo-count").textContent = `${photoIndex + 1} / ${photos.length}`;
  if (!$("#photo-viewer").open) $("#photo-viewer").showModal();
  history.replaceState(
    null,
    "",
    location.pathname + location.search + `#photo-${photoIndex + 1}`,
  );
}
$("#photo-close").onclick = () => {
  $("#photo-viewer").close();
};
$("#photo-viewer").addEventListener("close", () =>
  history.replaceState(null, "", location.pathname + location.search),
);
$("#photo-previous").onclick = () => openPhoto(photoIndex - 1);
$("#photo-next").onclick = () => openPhoto(photoIndex + 1);
$("#photo-viewer").addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowLeft") openPhoto(photoIndex - 1);
  if (ev.key === "ArrowRight") openPhoto(photoIndex + 1);
});
let touch;
$("#photo-viewer").addEventListener(
  "touchstart",
  (ev) =>
    (touch = ev.touches[0] && {
      x: ev.touches[0].clientX,
      y: ev.touches[0].clientY,
    }),
  { passive: true },
);
$("#photo-viewer").addEventListener(
  "touchend",
  (ev) => {
    if (!touch || !ev.changedTouches[0]) return;
    const dx = ev.changedTouches[0].clientX - touch.x,
      dy = ev.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
      openPhoto(photoIndex + (dx < 0 ? 1 : -1));
    touch = null;
  },
  { passive: true },
);
async function init() {
  try {
    const [content, settings, curated] = await Promise.all([
      fetch("/api/content", { signal: AbortSignal.timeout(8000) }).catch(
        () => ({ ok: false }),
      ),
      fetch("/club.json"),
      fetch("/community.json"),
    ]);
    const data = content.ok ? await content.json() : { entries: [] };
    club = await settings.json();
    if (page === "community" && club.communityEnabled !== true) {
      location.replace("/club");
      return;
    }
    const source = await curated.json();
    const merged = new Map(
      (source.entries ?? []).map((x) => [x.kind + ":" + x.slug, x]),
    );
    for (const x of data.entries ?? []) merged.set(x.kind + ":" + x.slug, x);
    entries = [...merged.values()].filter(
      (x) => kindRoute[x.kind] || x.kind === "page",
    );
    const homepage = entries.find(
      (x) => x.kind === "page" && x.slug === "homepage-introduction",
    )?.payload;
    if (homepage?.joinUrl) club.joinUrl = safeUrl(homepage.joinUrl);
    if (
      slug &&
      kindRoute[Object.keys(kindRoute).find((k) => kindRoute[k] === page)]
    ) {
      const x = entries.find(
        (x) => kindRoute[x.kind] === page && x.slug === slug,
      );
      if (x) detail(x);
      else
        main.innerHTML =
          intro(
            "Page not found.",
            "This page may still be a draft or its address may have changed.",
          ) +
          `<section class="section">${button("Explore the runs", "/events")}</section>`;
    } else if (page === "home") home();
    else if (["events", "gallery", "impact", "partners"].includes(page))
      directory();
    else if (page === "club") clubPage();
    else if (page === "first-run") firstRun();
    else if (page === "contact") contactPage();
    else if (page === "join") joinPage();
    else if (page === "shop") shopPage();
    else if (page === "account") await account();
    else if (page === "community")
      await renderCommunity({
        main,
        entries,
        club,
        card,
        button,
        intro,
        toast,
      });
    else if (page === "privacy") privacy();
    const photo = location.hash.match(/^#photo-(\d+)$/);
    if (photo && photos.length) openPhoto(Number(photo[1]) - 1);
  } catch (err) {
    main.innerHTML = `<div class="error-state"><h1>One moment.</h1><p>${e(err.message || "This page could not load.")}</p><button class="text-link" id="page-retry">Try again ↻</button></div>`;
    $("#page-retry").onclick = init;
  }
}
const menuDropdown = document.querySelector("#site-menu-dropdown");
const menuTrigger = document.querySelector("#open-site-menu");
menuDropdown?.addEventListener("toggle", () => {
  menuTrigger.setAttribute("aria-expanded", String(menuDropdown.open));
  document.body.classList.toggle("menu-is-open", menuDropdown.open);
  main.inert = menuDropdown.open;
  document.querySelector("body > .footer").inert = menuDropdown.open;
});
// Sample the section behind the floating identity instead of blending within a header layer.
let toneFrame = 0;
function updateBrandTone() {
  toneFrame = 0;
  const brand = document.querySelector(".wordmark-link");
  if (!brand) return;
  const rect = brand.getBoundingClientRect();
  const underneath = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    .find(node => !node.closest(".race-navigation, .urc-entrance, .skip"));
  let node = underneath, light = true;
  if (node?.closest(".runs-cover,.race-hero,.race-page-intro")) light = false;
  else while (node) {
    const color = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (color && (color.length < 4 || Number(color[3]) > .8)) {
      light = Number(color[0]) * .2126 + Number(color[1]) * .7152 + Number(color[2]) * .0722 > 145;
      break;
    }
    node = node.parentElement;
  }
  brand.dataset.tone = light ? "dark" : "light";
}
const scheduleTone = () => { if (!toneFrame) toneFrame = requestAnimationFrame(updateBrandTone); };
addEventListener("scroll", scheduleTone, {passive:true});
addEventListener("resize", scheduleTone);
new MutationObserver(scheduleTone).observe(main, {childList:true});
scheduleTone();
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuDropdown?.open) {
    menuDropdown.open = false;
    menuTrigger.setAttribute("aria-expanded", "false");
    menuTrigger.focus();
  }
});
document.addEventListener("pointerdown", (event) => {
  if (menuDropdown?.open && !menuDropdown.contains(event.target))
    menuDropdown.open = false;
});
init();
