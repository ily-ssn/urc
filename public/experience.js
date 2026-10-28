import { galleryHighlights } from "../lib/gallery.js";
import { escapeHtml as e, safeUrl } from "../lib/public.js";

const arrow =
  '<span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span>';
const link = (label, href, extra = "") =>
  `<a class="button ${extra}" href="${e(href)}">${e(label)} ${arrow}</a>`;
const photo = (url, alt, extra = "") =>
  `<img src="${e(safeUrl(url))}" alt="${e(alt)}" ${extra}>`;
export function raceCard(x, { formatDate, past = false } = {}) {
  const p = x.payload || {},
    theme = ["ice", "rose", "lime"].includes(p.theme) ? p.theme : "lime";
  const url = "/events/" + encodeURIComponent(x.slug);
  const eventDate = Number.isFinite(Date.parse(p.startsAt))
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Harare",
      }).format(new Date(p.startsAt))
    : "Date to be confirmed";
  return `<article class="race-card race-card-${theme}"><a class="race-card-image" href="${e(url)}">${p.coverUrl ? photo(p.coverUrl, p.coverAlt || x.title, 'loading="lazy"') : '<span class="race-placeholder">RUN<br>TOGETHER.</span>'}<span class="race-date">${e(eventDate)}</span></a><div class="race-card-body"><h3><a href="${e(url)}">${e(x.title)}</a></h3><p>${e(p.purpose || "A shared run. A reason to get together.")}</p><dl class="race-facts"><div><dt>MEETING POINT</dt><dd>${e(p.location || "To be confirmed")}</dd></div><div><dt>${past ? "ON THE DAY" : "THE EXPERIENCE"}</dt><dd>${e(p.partnerOffer || (formatDate ? formatDate(p.startsAt) : "Details inside"))}</dd></div></dl><div class="race-card-actions">${link("Discover the run", url, "race-discover")}<a class="ticket-button" href="${e(url)}#registration"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Z" stroke="currentColor" stroke-width="1.5"/><path d="M15 6v3m0 2v2m0 2v3" stroke="currentColor" stroke-width="1.5"/></svg>${past ? "Run details" : "Tickets"}<span class="sr-only"> for ${e(x.title)}</span></a></div></div></article>`;
}

function homeRacePreview(
  x,
  { sample = false, distance = "5 km", elevation = "48 m" } = {},
) {
  const url = "/events/" + encodeURIComponent(x.slug),
    p = x.payload || {};
  const date = sample
    ? "Design preview"
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Harare",
      }).format(new Date(p.startsAt));
  const action = sample
    ? `<button class="race-preview-discover" type="button" data-preview-run>Discover run</button>`
    : `<a class="race-preview-discover" href="${e(url)}">Discover run</a>`;
  return `<article class="home-run-card ${sample ? "home-run-sample" : "home-run-reset"}" id="${sample ? "preview-next-race" : "featured-reset"}"><div class="home-run-image">${photo(p.coverUrl || "/assets/urc-moment-3.jpg", p.coverAlt || x.title, 'loading="lazy"')}<span class="home-run-date">${e(date)}</span></div><div class="home-run-body"><h3>${e(x.title)}</h3><dl><div><dt>Distance</dt><dd>${e(sample ? distance : p.distance || "To be confirmed")}</dd></div><div><dt>Elevation +</dt><dd>${e(sample ? elevation : p.elevation || "To be confirmed")}</dd></div></dl><div class="home-run-actions">${action}<button class="race-card-arrow" type="button" ${sample ? "data-preview-run" : 'data-point-next="preview-next-race"'} aria-label="${sample ? "Open sample run preview" : "Point to the next race"}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="2"/></svg></button></div></div></article>`;
}

export function runFeature(x) {
  const p = x.payload || {},
    url = "/events/" + encodeURIComponent(x.slug);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Harare",
  }).format(new Date(p.startsAt));
  const arrow = `<span class="run-feature-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="2"/></svg></span>`;
  return `<article class="run-feature"><div class="run-feature-image">${photo(p.coverUrl || "/assets/urc-moment-3.jpg", p.coverAlt || x.title, 'loading="lazy"')}<span class="home-run-date">${e(date)}</span></div><div class="run-feature-body"><h2>${e(x.title)}</h2><p class="run-feature-subtitle">${e(p.partnerOffer || "A morning with Powerhouse")}</p><p>${e(p.purpose || "A community run in Harare.")} ${x.slug === "reset" ? "Start with the community run, then choose the cold plunge and sauna experience that suits you. Meet at 56 Kingsmead Road and check the event details before you arrive." : e(p.summary || "Read the event details for the meeting point, activities and plan for the day.")}</p><dl><div><dt>Distance</dt><dd>${e(p.distance || "5 km")}</dd></div><div><dt>Elevation +</dt><dd>${e(p.elevation || "To be confirmed")}</dd></div></dl><div class="run-feature-actions"><a href="${e(url)}"><span class="run-feature-button">Discover the run</span>${arrow}</a><a href="${e(url)}#registration"><span class="run-feature-button">Tickets</span>${arrow}</a></div></div></article>`;
}

const runnerSprite = `<g class="runner-sprite" transform="scale(.64)"><circle cx="4" cy="-25" r="4" fill="currentColor"/><path d="m1-17-4 12 7 5" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path data-run-arm d="m0-15 8 6 7-6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path data-run-front d="m3-1 8 7-5 10" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path data-run-back d="m2-1-9 8-10-3" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`;
function peopleIllustration(kind) {
  if (kind === 2)
    return `<svg class="feeling-chapter-drawing feeling-people" viewBox="0 0 320 240" fill="none" aria-hidden="true">${[-2, -1, 0, 1, 2].map((n, i) => `<g data-gather="${n * 37}" transform="translate(${n * 37} 0)"><circle cx="160" cy="94" r="7" fill="${i % 2 ? "#b0ec49" : "#fff"}"/><path d="M148 140v-23c0-16 24-16 24 0v23m-18 0-3 31m15-31 4 31" stroke="${i % 2 ? "#b0ec49" : "#fff"}" stroke-width="4" stroke-linecap="round"/></g>`).join("")}<path d="M133 53h45a7 7 0 0 1 7 7v17h-20l-10 9v-9h-22V53Z" stroke="currentColor" stroke-width="2"/></svg>`;
  if (kind === 1)
    return `<svg class="feeling-chapter-drawing feeling-runners" viewBox="0 0 320 240" fill="none" aria-hidden="true">${[70, 125, 180].map((y, i) => `<path d="M24 ${y}H296" class="feeling-line-base"/><path data-motion-path="${i}" d="M24 ${y}H296" class="feeling-line-fill" pathLength="1"/><g data-runner data-lane="${i}" data-pace="${[0.68, 1, 0.84][i]}" data-offset="0" transform="translate(24 ${y})">${runnerSprite}</g>`).join("")}</svg>`;
  return `<svg class="feeling-chapter-drawing feeling-runners" viewBox="0 0 320 240" fill="none" aria-hidden="true"><path d="M24 176H186L232 150 288 80" class="feeling-line-base"/><path data-motion-path="0" d="M24 176H186L232 150 288 80" class="feeling-line-fill" pathLength="1"/>${[0, 1, 2].map((i) => `<g data-runner data-lane="0" data-pace="1" data-offset="${i * 0.08}" transform="translate(${24 + i * 18} 176)">${runnerSprite}</g>`).join("")}</svg>`;
}

export function homeExperience({
  next,
  events = [],
  albums,
  settings,
  formatDate,
}) {
  const nextUrl = next ? "/events/" + encodeURIComponent(next.slug) : "/events";
  const allImages = albums.flatMap((a) =>
    (a.payload?.photos || [])
      .filter((p) => safeUrl(p.url))
      .map((p, photoIndex) => ({ ...p, album: a, photoIndex })),
  );
  const cover = safeUrl(settings.coverUrl) || "/assets/urc-community.jpg";
  // The supplied wide organiser photograph works at full-height without stretching the short banner.
  const hero =
    cover === "/assets/urc-community.jpg" ? "/assets/urc-moment-3.jpg" : cover;
  const images = galleryHighlights(albums).map(im => ({...im, photoIndex: im.index}));
  const route =
    "M269 44L249 111Q246 124 232 129L171 150Q155 155 148 171L124 222Q118 235 133 242L183 268Q193 273 190 289L181 344Q179 359 195 366L253 391Q270 398 265 417L252 463Q248 480 232 480H162Q146 480 141 497L124 551Q120 566 134 576L190 614Q201 621 205 634L220 680";
  const words =
    "Different paces. One community. We run for the people beside us. And the causes that bring us together.".split(
      " ",
    );
  return `<div class="home-sports"><section class="race-hero" aria-labelledby="home-title"><div class="race-hero-media">${photo(hero, settings.coverAlt || "Urban Run Community together in Harare", 'fetchpriority="high" decoding="async"')}</div><div class="race-hero-shade"></div><div class="home-event-overlay"><div class="home-hero-identity" aria-label="Urban Run Community">URC</div><div class="home-event-copy"><p>Up next with Powerhouse</p><h1 id="home-title">${e(next?.title || "Run with us")}</h1><p class="home-event-date">${next ? e(formatDate(next.payload.startsAt)) : "The next run is on its way"}</p><div class="home-event-actions">${next ? link("Sign up for the run", nextUrl + "#registration", "home-hero-button") : ""}${link("The run", nextUrl, "home-hero-button")}</div></div></div></section>
  <div class="race-dark-world"><div class="race-ticker" aria-hidden="true"></div><section class="race-manifesto" id="our-reason"><div class="race-route-art"><svg viewBox="0 0 400 740" fill="none" aria-hidden="true"><g class="race-local-roads"><path d="M34 99 249 111 355 64M16 162 171 150 318 196 400 171M0 224 124 222 310 288 400 267M24 325 181 344 302 326 400 365M0 427 167 431 253 391 389 419M14 482 162 480 344 516 400 489M0 581 124 551 321 585 400 560M35 691 220 680 400 711M75 0 94 135 53 282 94 410 58 614 88 740M269 0 269 44 249 111 232 129 310 288 302 326 253 391 265 417 252 463 344 516 321 585 350 740M161 0 150 85 171 150 148 171 124 222 133 242 183 268 190 289 181 344 195 366 167 431 162 480 141 497 124 551 134 576 190 614 205 634 220 680 210 740"/><path d="M1 42Q123 76 179 25T399 24M0 365Q87 311 126 360T400 347M0 631Q93 645 150 603T400 632"/></g><path d="${route}" class="race-route-base"/><path d="${route}" class="race-route-fill" pathLength="1"/><circle class="race-route-endpoint" cx="269" cy="44" r="8"/><circle class="race-route-endpoint" cx="220" cy="680" r="8"/></svg></div><div class="race-manifesto-copy"><h2 aria-label="${words.join(" ")}">${words.map((w) => `<span class="route-word" aria-hidden="true">${w} </span>`).join("")}</h2></div></section><section class="race-club-intro"><p>We’re a running community in Harare.</p><h2>For the kilometres.<br>For the cause.<br>For each other.</h2><p>A few kilometres, a local cause, a conversation that carries on after the finish. Show up on your own or bring your people. There’s room for you.</p><a class="race-text-link" href="/club">This is Powerhouse ${arrow}</a></section></div>
  <section class="race-lineup" id="runs"><div class="race-choose-heading"><div class="race-choose-marquee" aria-hidden="true"><span>CHOOSE YOUR RACE&nbsp; CHOOSE YOUR RACE&nbsp;</span></div><h2>Choose your race</h2></div><div class="race-lineup-grid">${homeRacePreview(next || { title: "The Reset", slug: "reset", payload: { startsAt: "2026-10-31T07:30:00+02:00", coverUrl: "/assets/reset.jpg", coverAlt: "RESET run, cold plunge and sauna event artwork" } })}${homeRacePreview({ title: "Sunday Social", slug: "sunday-social-preview", payload: { coverUrl: "/assets/urc-moment-3.jpg", coverAlt: "URC community photograph used for a sample run design" } }, { sample: true, distance: "10 km", elevation: "76 m" })}</div><p class="race-preview-note">Route figures and the second run are design previews.</p><dialog class="run-preview-dialog" id="run-preview-dialog" aria-labelledby="run-preview-title"><button type="button" id="close-run-preview" aria-label="Close sample run preview">Close ×</button><p>DESIGN PREVIEW</p><h2 id="run-preview-title">Sunday Social</h2><img src="/assets/urc-moment-3.jpg" alt="URC community together in Harare"><dl><div><dt>Distance</dt><dd>10 km</dd></div><div><dt>Elevation</dt><dd>76 m</dd></div></dl><p>This is a sample event for reviewing the card design. No date or route is confirmed and reservations are unavailable.</p></dialog></section>
  <section class="race-feeling"><div class="feeling-section-ghost" aria-hidden="true">THE FEELING</div><header class="feeling-section-head"><h2>The feeling</h2><div><h3>A young crowd.<br>Room for everyone.</h3><p>Come for a run. Bring your friends. Meet a few more. That’s URC.</p></div></header><div class="feeling-chapters">${[
    [
      "Run with Powerhouse",
      "Come on your own or with friends. There’s a group to head out with, whatever your pace. Find a run lead at the start and join in.",
    ],
    [
      "Your pace",
      "Fast, slow, stopping for a chat. You’re still part of the run. This is time together, not a competition with the person beside you.",
    ],
    [
      "More than the run",
      "Stick around after the finish. There’s usually a conversation, a new face or something planned with the people hosting us. Check the event for the food, recovery sessions and cause.",
    ],
  ]
    .map(
      ([title, text], i) =>
        `<article class="feeling-chapter"><div class="feeling-chapter-copy"><h3><span class="feeling-fill-heading">${e(title)}</span></h3><p><span class="feeling-fill-copy">${e(text)}</span></p></div>${peopleIllustration(i)}</article>`,
    )
    .join("")}</div></section>
  ${images.length ? `<section class="race-moments race-camera-roll"><header class="ref-section-heading"><div class="ref-section-ghost camera-roll-ghost" aria-hidden="true">THE CAMERA ROLL</div><h2>The camera roll</h2><h3>You had to be there.</h3><a class="race-text-link" href="/gallery">Open the gallery ${arrow}</a></header><div class="race-photo-strip">${images.map((im, i) => `<a href="/gallery/${e(encodeURIComponent(im.album.slug))}#photo-${im.photoIndex + 1}">${photo(im.url, im.alt || "A moment with URC", 'loading="lazy"')}<span class="camera-image-title">${e(im.caption || "Powerhouse")}</span></a>`).join("")}</div></section>` : ""}
  <section class="race-prepare race-before-go"><header class="ref-section-heading"><div class="ref-section-ghost" aria-hidden="true">BEFORE YOU GO</div><h2>Before you go</h2><h3>Pick a run. Pack light. Keep your pass.</h3></header><div class="race-prep-cards"><a href="/events">${photo(settings.prepRunUrl || images[0]?.url || hero, "Members of the URC community", 'loading="lazy"')}<div class="before-go-copy"><h3>Find the run.</h3><p>The run, the cause, the plan.</p><span class="race-prep-action">See the runs ${arrow}</span></div></a><a href="/first-run">${photo(settings.prepSimpleUrl || images[3]?.url || hero, "URC members together before a run", 'loading="lazy"')}<div class="before-go-copy"><h3>Keep it simple.</h3><p>Water and comfortable shoes. Check your event’s list.</p><span class="race-prep-action">What to bring ${arrow}</span></div></a><a href="${e(nextUrl)}#registration">${photo(settings.prepTicketUrl || allImages[4]?.url || hero, "A member of the URC community", 'loading="lazy"')}<div class="before-go-copy"><h3>Keep your ticket.</h3><p>Download your pass after your booking is confirmed.</p><span class="race-prep-action">Your next run ${arrow}</span></div></a></div></section></div>`;
}

export function eventExperience(x, { state, formatDate, related }) {
  const p = x.payload || {},
    hero = safeUrl(p.heroUrl) || "/assets/urc-moment-3.jpg";
  const distance =
    p.distance || (x.slug === "reset" ? "5 km" : "See activities");
  const difficulty =
    p.difficulty || (x.slug === "reset" ? "Easy" : "To be confirmed");
  const nextLabel =
    state === "past"
      ? "Past run"
      : state === "cancelled"
        ? "Event cancelled"
        : state === "postponed"
          ? "Event postponed"
          : "Run details";
  const stats = [
    ["Total distance", distance],
    ["Elevation gain", p.elevation || "Awaiting the route map"],
    ["Difficulty", difficulty],
    ["Estimated average time", p.estimatedTime || "30–60 minutes for 5 km"],
    [
      "Water checkpoints",
      p.waterCheckpoints || "1–2 proposed; details to follow",
    ],
  ];
  return `<header class="runs-cover shared-masthead course-masthead"><img src="${e(hero)}" alt="URC community photograph" fetchpriority="high"><div class="runs-cover-shade"></div><h1>${e(x.title)}</h1><div class="runs-diagonal" aria-hidden="true"></div></header><div class="event-world course-world"><section class="course-introduction"><h2>${e(p.headline || (x.slug === "reset" ? "Run. Cold plunge. Sauna." : x.title))}</h2><p>${p.description ? e(p.description) : x.slug === "reset" ? "A morning on the road, a sharp plunge into the cold, then the slower heat of the sauna. The Reset brings the three together on Saturday, 31 October. Meet at 56 Kingsmead Road, run with the group, then take your time with the recovery session you’ve chosen." : e(p.purpose || "Read the event details before registering.")}</p></section><section class="course-overview"><h2>${e(x.title)}</h2><div class="course-route-card"><div class="course-route-copy"><p>${e(nextLabel)}</p><h3>${e(p.location || "Meeting point to be confirmed")}</h3><strong>${e(distance)}</strong><p>${e(difficulty)} · ${e(p.partnerOffer || "Community run")}</p><p class="course-route-note">Route preview. The course map is still to be confirmed.</p><div class="course-race-switch" aria-label="Browse runs"><button type="button" aria-label="Previous run" disabled>←</button><button type="button" aria-label="Next run" disabled>→</button></div></div><div class="course-profile-preview"><svg viewBox="0 0 600 300" fill="none" aria-hidden="true"><g stroke="#71796a" stroke-dasharray="4 8" opacity=".4"><path d="M80 240V202M150 240V173M220 240V187M290 240V145M360 240V151M430 240V100M500 240V81"/></g><path d="M30 220 80 202 150 173 220 187 290 145 360 151 430 100 500 81 565 50" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M30 245H565" stroke="#71796a"/><circle cx="30" cy="220" r="5" fill="white"/><circle cx="565" cy="50" r="5" fill="white"/></svg><span>${e(difficulty)}</span><small>Illustrative profile</small></div></div></section><section class="course-figures"><div class="course-figures-copy"><h2>The run<br>in figures</h2><p class="course-figures-intro">${e(formatDate(p.startsAt))}</p><dl>${stats.map(([label, value], i) => `<div class="course-stat ${i === 0 ? "course-stat-primary" : ""}"><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join("")}</dl><section class="course-tickets" id="registration"><h3>Tickets</h3><p>Free attendance. Giving is optional.</p><div id="registration-form"></div><details class="course-day-details"><summary>On the day</summary><p>${e(p.arrival || "Check the meeting point and arrive for the briefing.")}</p><p>${e(p.checklist || "Bring water and comfortable running shoes. Check your chosen recovery session for anything else you need.")}</p>${p.recoveryLocation ? `<p>${e(p.recoveryLocation)}</p>` : ""}<p>${e(p.cancellationPolicy || "Check this page for changes before travelling.")}</p></details></section></div><img class="course-figures-photo" src="${e(safeUrl(p.figuresUrl) || "/assets/urc-moment-2.jpg")}" alt="URC members together at a previous run" loading="lazy"></section><section class="course-maps"><div class="course-maps-heading"><h2>Maps</h2><p>${e(p.location || "Meeting point to be confirmed")}</p></div><div class="course-map-actions">${safeUrl(p.mapUrl) ? `<a class="race-text-link" href="${e(safeUrl(p.mapUrl))}" target="_blank" rel="noopener noreferrer">Open in Google Maps <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a>` : ""}${safeUrl(p.stravaUrl) ? `<a class="race-text-link" href="${e(safeUrl(p.stravaUrl))}" target="_blank" rel="noopener noreferrer">Open in Strava <span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="1.7"/></svg></span></a>` : '<button class="race-text-link" type="button" disabled title="The Strava route has not been supplied yet">Open in Strava · coming soon</button>'}</div><div class="map-preview"><div class="map-consent"><p>Meeting point</p><button class="button outline" id="load-venue-map">Load venue map ${arrow}</button><small>Opens an interactive Google map.</small></div><div id="venue-map-frame" hidden></div></div></section>${state === "past" ? '<section class="section"><h2>After the run</h2><div id="feedback-form"></div></section>' : ""}${related}</div>`;
}
