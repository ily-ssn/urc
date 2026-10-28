import { homeExperience, eventExperience } from "./experience.js";
import { mountReservation } from "./reservation.js";
import {
  renderCommunity,
  renderMemberSettings,
  attachFollow,
} from "./network.js";
import { createClient } from "@supabase/supabase-js";
import {
  calendarFile,
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
  `<a class="button ${cls}" href="${e(url)}">${e(label)} <span aria-hidden="true">↗</span></a>`;
const intro = (title, body, back = "") =>
  `<header class="page-intro">${back ? `<a class="back" href="/${page}">← ${e(back)}</a>` : ""}<div class="page-intro-line"><h1>${e(title)}</h1><p>${e(body)}</p></div></header>`;
const empty = (title, body, url = "/first-run", label = "Your first run") =>
  `<div class="empty-state"><h2>${e(title)}</h2><p>${e(body)}</p>${button(label, url, "outline")}</div>`;
function toast(text) {
  $("#site-toast").textContent = text;
  $("#site-toast").hidden = false;
  setTimeout(() => ($("#site-toast").hidden = true), 4200);
}
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
    albums = entries.filter((x) => x.kind === "album").slice(0, 3),
    settings =
      entries.find(
        (x) => x.kind === "page" && x.slug === "homepage-introduction",
      )?.payload ?? {};
  main.innerHTML = homeExperience({ next, albums, settings, formatDate: date });
}

function directory() {
  const kind = {
      events: "event",
      gallery: "album",
      impact: "recap",
      partners: "partner",
    }[page],
    items = entries.filter((x) => x.kind === kind),
    titles = {
      events: [
        "Find your run.",
        "Confirmed dates, local causes and shared experiences. Attendance is free; giving is optional.",
      ],
      gallery: [
        "The moments.",
        "An album for each run. The people, places and time together around the miles.",
      ],
      impact: [
        "A reason to run.",
        "The causes behind our events and the outcomes we can confirm.",
      ],
      partners: [
        "Good company.",
        "The people and businesses supporting URC, and the contribution each makes.",
      ],
    };
  main.innerHTML =
    intro(...titles[page]) +
    `<section class="section" aria-label="${e(titles[page][0])}"><div class="toolbar"><label class="sr-only" for="directory-search">Search ${page}</label><input id="directory-search" type="search" placeholder="Search ${page === "events" ? "runs" : page}…"><label class="sr-only" for="directory-filter">Filter ${page}</label><select id="directory-filter">${
      page === "events"
        ? '<option value="upcoming">Upcoming runs</option><option value="past">Past runs</option><option value="all">All runs</option><option value="saved">Saved on this device</option>'
        : page === "gallery"
          ? '<option value="all">All years</option>' +
            [
              ...new Set(
                items
                  .map((x) =>
                    new Date(x.payload?.date || x.updatedAt).getFullYear(),
                  )
                  .filter(Number.isFinite),
              ),
            ]
              .sort((a, b) => b - a)
              .map((y) => `<option>${y}</option>`)
              .join("")
          : page === "partners"
            ? '<option value="all">All contributions</option>' +
              [
                ...new Set(
                  items.map((x) => x.payload?.partnerType).filter(Boolean),
                ),
              ]
                .map((t) => `<option>${e(t)}</option>`)
                .join("")
            : '<option value="all">All stories</option>'
    }</select></div><p id="directory-count" role="status"></p><div class="listing" id="directory-items"></div><div id="directory-empty"></div></section>${page === "partners" ? `<section class="section green-panel editorial-copy"><h2>There’s more than<br>one way to help.</h2><div><p>Design, venues, food, recovery experiences and financial support can each play a part. Tell us what you have in mind.</p><a class="text-link" href="/contact?topic=partnership">Talk about a collaboration ↗</a></div></section>` : ""}`;
  const render = () => {
    const term = $("#directory-search").value.toLowerCase(),
      filter = $("#directory-filter").value;
    let visible = items.filter((x) =>
      [x.title, x.payload.summary, x.payload.purpose, x.payload.contribution]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
    if (page === "events") {
      visible = visible.filter(
        (x) =>
          filter === "all" ||
          (filter === "saved" && saved().includes(x.id)) ||
          filter === eventState(x),
      );
      visible.sort(
        (a, b) =>
          (filter === "past" ? -1 : 1) *
          (Date.parse(a.payload.startsAt) - Date.parse(b.payload.startsAt)),
      );
    } else if (page === "gallery" && filter !== "all")
      visible = visible.filter(
        (x) =>
          String(new Date(x.payload.date || x.updatedAt).getFullYear()) ===
          filter,
      );
    else if (page === "partners" && filter !== "all")
      visible = visible.filter((x) => x.payload.partnerType === filter);
    $("#directory-items").innerHTML = visible.map(card).join("");
    $("#directory-count").textContent =
      `${visible.length} ${visible.length === 1 ? "result" : "results"}`;
    $("#directory-empty").innerHTML = visible.length
      ? ""
      : empty(
          items.length
            ? "Nothing matches this view."
            : page === "gallery"
              ? "Our own moments, in their own time."
              : page === "impact"
                ? "Real stories. Confirmed outcomes."
                : page === "partners"
                  ? "Good collaborations take people."
                  : "The next run is taking shape.",
          items.length
            ? "Try another search or filter."
            : page === "gallery"
              ? "Each published event album will live here. No reference photos are presented as URC event photographs."
              : page === "impact"
                ? "Recaps and verified results will appear after the runs. We do not present estimates as confirmed giving."
                : page === "partners"
                  ? "Confirmed partners and their contributions will appear here. Interested in working with URC? Talk to the team."
                  : "Dates, distances and registration will appear when the next run is confirmed.",
        );
  };
  $("#directory-search").addEventListener("input", render);
  $("#directory-filter").addEventListener("change", render);
  render();
}
function sectionBlock(title, text) {
  return text ? `<section><h2>${e(title)}</h2><p>${e(text)}</p></section>` : "";
}
function detail(x) {
  const p = x.payload ?? {};
  document.title = x.title + " · URC";
  main.innerHTML = intro(
    x.title,
    x.kind === "event" ? date(p.startsAt) : p.summary || p.contribution || "",
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
      $(".map-grid").hidden = true;
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
    if ($("#waitlist-form")) requestForm($("#waitlist-form"), "waitlist", x.id);
    if ($("#feedback-form")) requestForm($("#feedback-form"), "feedback", x.id);
    $("#event-calendar").addEventListener("click", () =>
      download(
        `urc-${x.slug}.ics`,
        calendarFile(x, location.origin),
        "text/calendar",
      ),
    );
    $("#event-poster").addEventListener("click", () => poster(x));
    $("#event-share").addEventListener("click", () => share(x));
    $("[data-save]").addEventListener("click", () => saveRun(x.id));
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
    intro(
      "Powerhouse.",
      "A run club rooted in Harare, with room for different paces, people and reasons to show up.",
    ) +
    `<section class="section editorial-copy"><h2>A lifestyle<br>in motion.</h2><div><p>${e(settings?.summary || "Powerhouse Urban Run Club brings people together through shared runs and purpose-led events in Harare. We build each day around movement, a local cause and experiences made possible with our partners.")}</p><p>We usually come together for one or two runs a month. The confirmed event page tells you what is planned, who it supports and what to expect.</p><p>You do not need a member account to join a run. Attendance is free, and giving is optional.</p><a href="/events" class="text-link">Find a run that suits you ↗</a></div></section><section class="section green-panel"><div class="section-head"><h2>The run is part of the day.</h2><p>The experience around it matters too.</p></div><nav class="big-links" aria-label="Life around URC"><a href="/partners">Local collaborations <span>↗</span></a><a href="/impact">Causes we support <span>↗</span></a><a href="/gallery">The people and moments <span>↗</span></a></nav></section><section class="section editorial-copy"><h2>Built by<br>the community.</h2><div><p>Want to help at a run, photograph an event or bring a partner experience to the club? Tell the organisers what you have in mind.</p><a href="/contact?topic=volunteer" class="text-link">Volunteer with URC ↗</a></div></section>`;
  const moments = entries
    .filter((x) => x.kind === "album")
    .flatMap((x) => x.payload.photos || [])
    .filter((x) => safeUrl(x.url))
    .slice(0, 3);
  if (moments.length)
    $(".editorial-copy", main).insertAdjacentHTML(
      "afterend",
      `<section class="section club-family"><div class="section-head"><h2>A familiar face.<br>A place to belong.</h2><p>More than a date in the calendar. Time with people who make room for you.</p></div><div class="club-family-photos">${moments.map((im) => `<img src="${e(safeUrl(im.url))}" alt="${e(im.alt || "URC community photograph")}" loading="lazy">`).join("")}</div><p class="image-credit">From the club’s community collection. <a href="/gallery">See the gallery and photo credits ↗</a></p></section>`,
    );
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
    `<section class="section guide-grid"><h2>A little preparation.<br>A simpler start.</h2><div><ul class="checklist">${steps.map(([title, body], i) => `<li><label><input type="checkbox" data-checklist="${i}"><span>${e(title)}</span></label><p>${e(body)}</p></li>`).join("")}</ul><p class="image-credit">Your checklist is kept on this device.</p>${button("See upcoming runs", "/events")}</div></section><section class="section green-panel editorial-copy"><h2>Choose a pace<br>you can enjoy.</h2><div><p>For an easy social effort, you should be able to speak in sentences. The event details explain what activities are available; a run lead can help you choose on the day.</p><p>This is general guidance, not a fitness assessment. Choose what suits your health and experience.</p></div></section><section class="section prose faq"><h2>A few good questions.</h2>${[
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
    intro(
      "Wear the club.",
      "URC merchandise and collaboration collections, when they’re ready to drop.",
    ) +
    `<section class="section editorial-copy"><h2>Something to<br>take with you.</h2><div><p>Clothing, running gear and collaboration pieces will have their own product pages, sizing, availability and ordering information.</p><p class="notice">No merchandise is available to order online yet. Checkout and stock need the club’s confirmed merchant platform.</p><a class="text-link" href="/contact?topic=general">Ask the organisers about merchandise ↗</a></div></section><section class="section green-panel editorial-copy"><h2>Made together.</h2><div><p>Have a product collaboration in mind? Tell us what you make and how it could support the URC community.</p><a class="text-link" href="/contact?topic=partnership">Propose a collaboration ↗</a></div></section>`;
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
async function poster(x) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d"),
    p = x.payload;
  ctx.fillStyle = { rose: "#edb6b2", ice: "#c4ded9" }[p.theme] || "#7cda4f";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#161815";
  ctx.font = '800 360px "Barlow Condensed"';
  ctx.fillText("URC", 62, 340);
  ctx.font = '700 96px "Barlow Condensed"';
  let line = "",
    y = 550;
  for (const word of x.title.toUpperCase().split(" ")) {
    const next = line + word + " ";
    if (ctx.measureText(next).width > 950) {
      ctx.fillText(line, 64, y);
      line = word + " ";
      y += 100;
    } else line = next;
  }
  ctx.fillText(line, 64, y);
  ctx.font = "600 25px Manrope";
  ctx.fillText(date(p.startsAt), 64, 1050, 950);
  ctx.fillText(p.location || "Harare, Zimbabwe", 64, 1100, 950);
  ctx.font = "500 22px Manrope";
  ctx.fillText("POWERHOUSE URBAN RUN CLUB", 64, 1220);
  ctx.fillText("FREE ATTENDANCE. OPTIONAL GIVING.", 64, 1270);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `urc-${x.slug}-poster.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }, "image/png");
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
init();
