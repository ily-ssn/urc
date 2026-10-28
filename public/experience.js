import { escapeHtml as e, safeUrl } from "../lib/public.js";

const arrow = '<span aria-hidden="true">↗</span>';
const link = (label, href, extra = "") =>
  `<a class="button ${extra}" href="${e(href)}">${e(label)} ${arrow}</a>`;
const photo = (url, alt, extra = "") =>
  `<img src="${e(safeUrl(url))}" alt="${e(alt)}" ${extra}>`;
const dateParts = (value) => {
  if (!Number.isFinite(Date.parse(value))) return ["NEXT", "RUN"];
  const d = new Date(value);
  return [
    new Intl.DateTimeFormat("en", {
      day: "2-digit",
      timeZone: "Africa/Harare",
    }).format(d),
    new Intl.DateTimeFormat("en", { month: "short", timeZone: "Africa/Harare" })
      .format(d)
      .toUpperCase(),
  ];
};
export const routeDrawing = `<svg viewBox="0 0 360 180" fill="none" aria-hidden="true"><path d="M23 143C69 143 52 43 115 43S133 142 200 142 227 43 302 43H338" stroke="currentColor" stroke-width="3" stroke-dasharray="8 8"/><circle cx="23" cy="143" r="12" fill="currentColor"/><circle cx="338" cy="43" r="17" stroke="currentColor" stroke-width="3"/><path d="m330 43 6 6 11-14" stroke="currentColor" stroke-width="3"/></svg>`;

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
  return `<article class="home-run-card ${sample ? "home-run-sample" : "home-run-reset"}" id="${sample ? "preview-next-race" : "featured-reset"}"><div class="home-run-image">${photo(p.coverUrl || "/assets/urc-moment-3.jpg", p.coverAlt || x.title, 'loading="lazy"')}<span class="home-run-date">${e(date)}</span></div><div class="home-run-body"><h3>${e(x.title)}</h3><dl><div><dt>Distance</dt><dd>${e(distance)}</dd></div><div><dt>Elevation +</dt><dd>${e(elevation)}</dd></div></dl><div class="home-run-actions">${action}<button class="race-card-arrow" type="button" ${sample ? "data-preview-run" : 'data-point-next="preview-next-race"'} aria-label="${sample ? "Open sample run preview" : "Point to the next race"}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M6 5h13v13" stroke="currentColor" stroke-width="2"/></svg></button></div></div></article>`;
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
  const images = allImages.slice(0, 4);
  const route =
    "M269 44L249 111Q246 124 232 129L171 150Q155 155 148 171L124 222Q118 235 133 242L183 268Q193 273 190 289L181 344Q179 359 195 366L253 391Q270 398 265 417L252 463Q248 480 232 480H162Q146 480 141 497L124 551Q120 566 134 576L190 614Q201 621 205 634L220 680";
  const words =
    "Different paces. One community. We run for the people beside us. And the causes that bring us together.".split(
      " ",
    );
  return `<div class="home-sports"><section class="race-hero" aria-labelledby="home-title"><div class="race-hero-media">${photo(hero, settings.coverAlt || "Urban Run Community together in Harare", 'fetchpriority="high" decoding="async"')}</div><div class="race-hero-shade"></div><h1 id="home-title" class="sr-only" aria-label="URC.">Urban Run Community</h1></section>
  <div class="race-dark-world"><div class="race-ticker" aria-hidden="true"></div><section class="race-manifesto" id="our-reason"><div class="race-route-art"><svg viewBox="0 0 400 740" fill="none" aria-hidden="true"><g class="race-local-roads"><path d="M34 99 249 111 355 64M16 162 171 150 318 196 400 171M0 224 124 222 310 288 400 267M24 325 181 344 302 326 400 365M0 427 167 431 253 391 389 419M14 482 162 480 344 516 400 489M0 581 124 551 321 585 400 560M35 691 220 680 400 711M75 0 94 135 53 282 94 410 58 614 88 740M269 0 269 44 249 111 232 129 310 288 302 326 253 391 265 417 252 463 344 516 321 585 350 740M161 0 150 85 171 150 148 171 124 222 133 242 183 268 190 289 181 344 195 366 167 431 162 480 141 497 124 551 134 576 190 614 205 634 220 680 210 740"/><path d="M1 42Q123 76 179 25T399 24M0 365Q87 311 126 360T400 347M0 631Q93 645 150 603T400 632"/></g><path d="${route}" class="race-route-base"/><path d="${route}" class="race-route-fill" pathLength="1"/><circle class="race-route-endpoint" cx="269" cy="44" r="8"/><circle class="race-route-endpoint" cx="220" cy="680" r="8"/></svg></div><div class="race-manifesto-copy"><h2 aria-label="${words.join(" ")}">${words.map((w) => `<span class="route-word" aria-hidden="true">${w} </span>`).join("")}</h2></div></section><section class="race-club-intro"><p>We’re a running community in Harare.</p><h2>For the kilometres.<br>For the cause.<br>For each other.</h2><p>A few kilometres, a local cause, a conversation that carries on after the finish. Show up on your own or bring your people. There’s room for you.</p><a class="race-text-link" href="/club">This is Powerhouse ${arrow}</a></section></div>
  <section class="race-lineup" id="runs"><div class="race-choose-heading"><div class="race-choose-marquee" aria-hidden="true"><span>CHOOSE YOUR RACE&nbsp; CHOOSE YOUR RACE&nbsp;</span></div><h2>Choose your race</h2></div><div class="race-lineup-grid">${homeRacePreview(next || { title: "RESET", slug: "reset", payload: { startsAt: "2026-10-31T07:30:00+02:00", coverUrl: "/assets/reset.jpg", coverAlt: "RESET run, cold plunge and sauna event artwork" } })}${homeRacePreview({ title: "Sunday Social", slug: "sunday-social-preview", payload: { coverUrl: "/assets/urc-moment-3.jpg", coverAlt: "URC community photograph used for a sample run design" } }, { sample: true, distance: "10 km", elevation: "76 m" })}</div><p class="race-preview-note">Route figures and the second run are design previews.</p><dialog class="run-preview-dialog" id="run-preview-dialog" aria-labelledby="run-preview-title"><button type="button" id="close-run-preview" aria-label="Close sample run preview">Close ×</button><p>DESIGN PREVIEW</p><h2 id="run-preview-title">Sunday Social</h2><img src="/assets/urc-moment-3.jpg" alt="URC community together in Harare"><dl><div><dt>Distance</dt><dd>10 km</dd></div><div><dt>Elevation</dt><dd>76 m</dd></div></dl><p>This is a sample event for reviewing the card design. No date or route is confirmed and reservations are unavailable.</p></dialog></section>
  <section class="race-feeling"><div class="feeling-section-ghost" aria-hidden="true">THE FEELING</div><header class="feeling-section-head"><h2>The feeling</h2><div><h3>A young crowd.<br>Room for everyone.</h3><p>Come for a run. Bring your friends. Meet a few more. That’s URC.</p></div></header><div class="feeling-chapters">${[
    [
      "Free start",
      "Your first step is simple. Pick a run, find the meeting point and say hello. Attendance is free. Giving is up to you.",
      "M15 176H74L118 151H180L229 80H278",
    ],
    [
      "Run together",
      "Some of us are chasing a time. Some of us are catching up with a friend. Find your pace, stay with your group and look out for the people beside you.",
      "M15 151L61 122H106L145 156H191L234 75H278",
    ],
    [
      "Stay a while",
      "The finish line isn’t a rush to leave. Hang around, get something to eat or join the recovery session when it’s part of the day. The event page has the plan.",
      "M15 168H68L109 100H154L198 136H235L278 79",
    ],
  ]
    .map(
      ([title, text, route], i) =>
        `<article class="feeling-chapter"><span class="feeling-chapter-number">${String(i + 1).padStart(2, "0")}</span><div class="feeling-chapter-copy"><h3><span class="feeling-fill-heading">${e(title)}</span></h3><p><span class="feeling-fill-copy">${e(text)}</span></p></div><svg class="feeling-chapter-drawing" viewBox="0 0 300 240" fill="none" aria-hidden="true"><path d="${route}" class="feeling-line-base"/><path d="${route}" class="feeling-line-fill" pathLength="1"/><circle cx="15" cy="${i === 1 ? 151 : i === 2 ? 168 : 176}" r="5" fill="white"/><circle cx="278" cy="${i === 0 ? 80 : i === 1 ? 75 : 79}" r="5" fill="white"/></svg></article>`,
    )
    .join("")}</div></section>
  ${images.length ? `<section class="race-moments"><div class="race-section-heading"><div><p class="race-eyebrow">04 / THE CAMERA ROLL</p><h2>You had to<br>be there.</h2></div><p>Early starts.<br>Good company. Real memories.</p><a class="race-text-link" href="/gallery">See the gallery ${arrow}</a></div><div class="race-photo-strip">${images.map((im, i) => `<a href="/gallery/${e(encodeURIComponent(im.album.slug))}#photo-${im.photoIndex + 1}">${photo(im.url, im.alt || "A moment with URC", 'loading="lazy"')}<span>URC / ${String(i + 1).padStart(2, "0")} ${arrow}</span></a>`).join("")}</div><p class="race-photo-credit">From the URC organiser’s community albums. Individual credits inside.</p></section>` : ""}
  <section class="race-prepare"><div class="race-section-heading"><div><p class="race-eyebrow">05 / BEFORE YOU GO</p><h2>Less overthinking.<br>More showing up.</h2></div><a class="race-text-link" href="/first-run">Your first-run guide ${arrow}</a></div><div class="race-prep-cards"><a href="/events"><span>01 / PICK YOUR DAY</span><h3>Find a run.</h3>${photo(images[1]?.url || hero, "", 'loading="lazy"')}<span class="race-prep-action">The run, the cause, the plan ${arrow}</span></a><a href="/first-run"><span>02 / YOUR KIT</span><h3>Keep it simple.</h3><svg viewBox="0 0 280 170" fill="none" aria-hidden="true"><path d="M45 60 88 41l33 47 61 9 45 27-5 20H42l-10-19 13-65Z" stroke="currentColor" stroke-width="3"/><path d="m45 111 37 11 122 1m-98-54-17 15m28-1-17 15m29-2-17 15M37 135h186" stroke="currentColor" stroke-width="3"/><path d="m216 44 10-18m-2 34 19-6m-43-21-3-19" stroke="currentColor" stroke-width="2"/></svg><span class="race-prep-action">Water. Comfortable shoes. You. ${arrow}</span></a><a href="${e(nextUrl)}#registration"><span>03 / YOUR PLACE</span><h3>Keep your ticket.</h3><div class="race-ticket-art" aria-hidden="true"><span>URC / HARARE</span><strong>SEE YOU<br>AT THE START.</strong><span>FREE ATTENDANCE / OPTIONAL GIVING</span></div><span class="race-prep-action">Choose your experience ${arrow}</span></a></div></section></div>`;
}

const paragraph = (text) => `<p>${e(text)}</p>`;
export function eventExperience(x, { state, formatDate, saved, related }) {
  const p = x.payload || {},
    [day, month] = dateParts(p.startsAt);
  const block = (title, text, extra = "") =>
    text
      ? `<section class="event-chapter ${extra}"><h2>${e(title)}</h2>${paragraph(text)}</section>`
      : "";
  return `<div class="wrap event-world"><div class="event-cover-stage">${p.coverUrl ? photo(p.coverUrl, p.coverAlt || x.title, 'class="event-cover-image" fetchpriority="high"') : `<div class="event-poster"><h2>${e(x.title)}</h2><span>POWERHOUSE / HARARE</span></div>`}<div class="event-cover-stamp"><strong>${e(day)}</strong><span>${e(month)}</span></div></div><div class="detail-actions event-actionbar"><a class="ticket-button event-ticket-jump" href="#registration">Tickets <span aria-hidden="true">↗</span></a><button data-save="${e(x.id)}" aria-pressed="${saved}">${saved ? "Saved ✓" : "Save this run"}<span aria-hidden="true">＋</span></button><button id="event-calendar">Add to calendar <span aria-hidden="true">↓</span></button><button id="event-share">Share this run <span aria-hidden="true">↗</span></button><button id="event-poster">Download event poster <span aria-hidden="true">↓</span></button></div><div class="detail-layout event-layout"><div class="detail-main"><section class="event-chapter event-purpose"><span class="section-index">01 / THE IDEA</span><h2>A morning<br>worth showing up for.</h2>${paragraph(p.purpose || "See the organiser’s confirmed event information before reserving.")}</section><section class="event-activities"><div><p class="section-index">02 / YOUR DAY</p><h2>Make it<br>your kind<br>of morning.</h2>${paragraph(p.activities || "Activity details will be confirmed by the organiser.")}</div><div class="activity-paper">${routeDrawing}<h3>${e(p.partnerOffer || "Move together.")}</h3><p>${e(p.offerTerms || "Read the event’s participation details before choosing an activity.")}</p></div></section>${
    p.itinerary
      ? `<section class="event-chapter"><span class="section-index">03 / THE PLAN</span><h2>From the first hello<br>to the last goodbye.</h2><ol class="day-schedule">${String(
          p.itinerary,
        )
          .split(/\n/)
          .filter(Boolean)
          .map((line) => `<li>${e(line)}</li>`)
          .join("")}</ol></section>`
      : ""
  }<section class="event-chapter venue-section"><span class="section-index">04 / THE PLACE</span><h2>Meet us here.</h2><div class="venue-address"><strong>${e(p.location)}</strong><span>Harare, Zimbabwe</span></div>${paragraph(p.arrival || "Check the meeting point and arrive in time for the briefing.")}<div class="map-preview"><div class="map-grid" aria-hidden="true"><i></i><span>URC / MEETING POINT</span></div><div class="map-consent"><p>See the meeting point on a map.</p><button class="button outline" id="load-venue-map">Load venue map ↗</button><small>Loads an interactive Google map.</small></div><div id="venue-map-frame" hidden></div></div>${safeUrl(p.mapUrl) ? `<a class="text-link" href="${e(safeUrl(p.mapUrl))}" target="_blank" rel="noopener noreferrer">Open directions in Maps ↗</a>` : ""}${p.recoveryLocation ? `<div class="recovery-location"><h3>Cold plunge & sauna</h3>${paragraph(p.recoveryLocation)}${safeUrl(p.recoveryMapUrl) ? link("Recovery venue directions", safeUrl(p.recoveryMapUrl), "outline") : ""}</div>` : p.partnerOffer ? '<p class="image-credit">The address above is the listed meeting point. Confirm the recovery-session arrangements with the organiser before travelling.</p>' : ""}</section><section class="event-essentials"><div><h2>A good day<br>starts prepared.</h2><a class="text-link" href="/first-run">Your first club run? Start here ↗</a></div><div>${block("Bring along", p.checklist || "Water, comfortable shoes and suitable layers. Follow the organiser’s route and safety instructions.")}${block("Access and comfort", p.accessibility || "Ask the organiser about access or support you need before registering.")}${block("Need a hand?", p.organiserContact)}</div></section>${state === "past" ? '<section class="event-chapter"><h2>How was your run?</h2><p>Tell the organisers what worked and what could be better.</p><div id="feedback-form"></div></section>' : ""}</div><aside class="detail-side reservation-card" id="registration"><div class="reservation-card-top"><span>YOUR NEXT STARTING LINE</span><span>U<i>R</i>C</span></div><h2>${state === "past" ? "Until the next one." : state === "cancelled" ? "Event cancelled." : state === "postponed" ? "Event postponed." : "You’re invited."}</h2><p class="reservation-price">Free <small>attendance</small></p><dl><dt>When</dt><dd>${e(formatDate(p.startsAt))}</dd><dt>Meeting point</dt><dd>${e(p.location)}</dd><dt>Your experience</dt><dd>${e(p.partnerOffer || p.activities)}</dd>${p.registrationClosesAt ? `<dt>Reservations close</dt><dd>${e(formatDate(p.registrationClosesAt))}</dd>` : ""}</dl><div id="registration-form"></div><div class="reservation-footnote"><p>No donation requirement.<br>No account required.</p><a class="text-link" href="/privacy">Participation & privacy ↗</a></div><details class="event-policy"><summary>Registration and changes</summary>${paragraph(p.cancellationPolicy || "Keep your private pass link safe. Your attendance pass and any optional giving are separate.")}</details></aside></div>${related}</div>`;
}
