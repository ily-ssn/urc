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
  const [day, month] = dateParts(p.startsAt);
  return `<article class="race-card race-card-${theme}"><a class="race-card-image" href="${e(url)}">${p.coverUrl ? photo(p.coverUrl, p.coverAlt || x.title, 'loading="lazy"') : '<span class="race-placeholder">RUN<br>TOGETHER.</span>'}<span class="race-date">${e(day)} / ${e(month)}</span></a><div class="race-card-body"><p class="race-eyebrow">${past ? "FROM THE ARCHIVE" : "THE NEXT STARTING LINE"}</p><h3><a href="${e(url)}">${e(x.title)}</a></h3><p>${e(p.purpose || "A shared run. A reason to get together.")}</p><dl class="race-facts"><div><dt>MEETING POINT</dt><dd>${e(p.location || "To be confirmed")}</dd></div><div><dt>${past ? "WHEN WE RAN" : "ON THE DAY"}</dt><dd>${e(p.partnerOffer || (formatDate ? formatDate(p.startsAt) : "Details inside"))}</dd></div></dl><div class="race-card-actions">${link("Discover the run", url, "race-discover")}<a class="ticket-button" href="${e(url)}#registration"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Z" stroke="currentColor" stroke-width="1.5"/><path d="M15 6v3m0 2v2m0 2v3" stroke="currentColor" stroke-width="1.5"/></svg>${past ? "Run details" : "Tickets"}<span class="sr-only"> for ${e(x.title)}</span></a></div></div></article>`;
}

export function homeExperience({
  next,
  events = [],
  albums,
  settings,
  formatDate,
}) {
  const nextUrl = next ? "/events/" + encodeURIComponent(next.slug) : "/events";
  const p = next?.payload || {};
  const allImages = albums.flatMap((a) =>
    (a.payload?.photos || [])
      .filter((p) => safeUrl(p.url))
      .map((p, photoIndex) => ({ ...p, album: a, photoIndex })),
  );
  const cover = safeUrl(settings.coverUrl) || "/assets/urc-community.jpg";
  // The supplied wide organiser photograph works at full-height without stretching the short banner.
  const hero =
    cover === "/assets/urc-community.jpg" ? "/assets/urc-moment-3.jpg" : cover;
  const images = allImages.slice(0, 4),
    portrait = allImages[4] || allImages[0];
  const albumUrl = albums[0]
    ? "/gallery/" + encodeURIComponent(albums[0].slug)
    : "/gallery";
  const route =
    "M165 16C277 37 41 88 157 136S315 169 202 224 40 268 128 318 281 329 176 391 93 418 140 470 270 503 166 552 103 577 164 620";
  const words =
    "Different paces. One community. We run for the people beside us. And the causes that bring us together.".split(
      " ",
    );
  return `<div class="home-sports"><section class="race-hero" aria-labelledby="home-title"><div class="race-hero-media">${photo(hero, settings.coverAlt || "Urban Run Community together in Harare", 'fetchpriority="high" decoding="async"')}</div><div class="race-hero-shade"></div><div class="race-hero-copy"><p class="race-hero-kicker">HARARE, ZIMBABWE / A LIFESTYLE IN MOTION</p><h1 id="home-title" aria-label="URC."><span class="race-brand-placeholder">URBAN RUN<br>COMMUNITY.</span></h1><h2>Good miles.<br>Even better company.</h2><p class="race-reveal-line"><span>POWERHOUSE URBAN RUN CLUB</span></p></div><div class="race-hero-bottom"><a class="race-recap-preview" href="${e(albumUrl)}">${photo(images[0]?.url || hero, "", 'loading="lazy"')}<span><small>LAST TIME OUT</small><strong>The people. The moments.</strong><span>Open the photos ↗</span></span></a><a class="race-next-preview" href="${e(nextUrl)}"><span class="race-live-dot" aria-hidden="true"></span><div><small>${next ? "NEXT UP / " + e(formatDate(p.startsAt)) : "THE NEXT CHAPTER"}</small><strong>${e(next?.title || "We’ll see you out there.")}</strong><span>${e(p.partnerOffer || "Explore the club runs")} ↗</span></div></a></div><a class="race-scroll" href="#our-reason">SCROLL TO MEET THE CLUB <span aria-hidden="true">↓</span></a></section>
  <div class="race-ticker" aria-label="Run together. Give back. Recover. Repeat."><span>RUN TOGETHER.</span><span>GIVE BACK.</span><span>RECOVER.</span><span>REPEAT.</span><span aria-hidden="true">RUN TOGETHER.</span></div>
  <section class="race-manifesto" id="our-reason"><div class="race-route-art"><svg viewBox="0 0 330 650" fill="none" aria-hidden="true"><path d="${route}" class="race-route-base"/><path d="${route}" class="race-route-fill" pathLength="1"/><circle cx="165" cy="16" r="7" fill="currentColor"/><circle cx="164" cy="620" r="10" stroke="currentColor" stroke-width="2"/></svg><span>THE LINE BRINGS US TOGETHER.<br>ILLUSTRATION / NOT A RUN ROUTE</span></div><div class="race-manifesto-copy"><p class="race-eyebrow">01 / MORE THAN THE DISTANCE</p><h2 aria-label="${words.join(" ")}">${words.map((w, i) => `<span class="route-word" aria-hidden="true">${w} </span>`).join("")}</h2><div class="race-manifesto-note"><p>We’re a young running community in Harare. A few kilometres, a local cause, a conversation that carries on after the finish. Show up on your own or bring your people. There’s room for you.</p><a class="race-text-link" href="/club">This is Powerhouse ${arrow}</a></div></div></section>
  <section class="race-lineup" id="runs"><div class="race-section-heading"><div><p class="race-eyebrow">02 / THE STARTING LINE</p><h2>Make a day<br>of it.</h2></div><p>A run is where it starts.<br>The rest is why you stay.</p><a class="race-text-link" href="/events">All runs ${arrow}</a></div><div class="race-lineup-grid">${(events.length ? events.slice(0, 2) : next ? [next] : []).map((x) => raceCard(x, { formatDate })).join("") || '<div class="race-no-event"><h3>The next chapter is taking shape.</h3><p>Confirmed runs will appear here when the details are ready.</p><a class="button" href="/events">Explore the runs ↗</a></div>'}<a class="race-lineup-invitation" href="/first-run"><span>FIRST TIME?</span><div class="race-loop" aria-hidden="true">${routeDrawing}</div><h3>You don’t need<br>to be fast.<br>Just be there.</h3><span class="race-text-link">Your first run, sorted ${arrow}</span></a></div></section>
  <section class="race-experience"><div class="race-experience-header"><p class="race-eyebrow">03 / THE EXPERIENCE</p><h2>More than a run.<br><span>A whole feeling.</span></h2></div><div class="race-experience-grid"><div class="race-experience-photo">${photo(portrait?.url || hero, portrait?.alt || "A member of the URC community", 'loading="lazy"')}<span>YOUR PEOPLE ARE OUT THERE.</span></div><div class="race-experience-chapters"><article><span>01 / SHOW UP</span><h3>Find your people.</h3><p>New faces become familiar ones. Follow club updates, see what’s next and meet members who choose to share their profiles.</p><a class="race-text-link" href="/community">Around the community ${arrow}</a></article><article><span>02 / GIVE BACK</span><h3>A reason beyond the run.</h3><p>Our charity runs bring attention and optional giving to local causes. Each event tells its own story. Attendance and donations stay separate.</p><a class="race-text-link" href="/impact">The causes we support ${arrow}</a></article><article><span>03 / STAY A WHILE</span><h3>The finish isn’t the end.</h3><p>Food, recovery sessions and local collaborations can turn a run into a whole morning. Check each event for what’s included and where to go.</p><a class="race-text-link" href="/partners">Meet the collaborators ${arrow}</a></article></div></div></section>
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
