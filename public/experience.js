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

export function homeExperience({ next, albums, settings, formatDate }) {
  const nextUrl = next ? "/events/" + encodeURIComponent(next.slug) : "/events";
  const p = next?.payload || {},
    [day, month] = dateParts(p.startsAt);
  const allImages = albums.flatMap((a) =>
    (a.payload?.photos || [])
      .filter((p) => safeUrl(p.url))
      .map((p, photoIndex) => ({ ...p, album: a, photoIndex })),
  );
  const images = allImages.slice(0, 4);
  const portrait = allImages[4] || allImages[0];
  const cover = safeUrl(settings.coverUrl) || "/assets/urc-community.jpg";
  return `<section class="home-top"><div class="home-title"><h1>U<i>R</i><span>C.</span></h1><div><strong>Powerhouse<br>Urban Run Club.</strong><p>Harare, Zimbabwe.<br>A lifestyle in motion.</p></div></div><div class="home-visual">${photo(cover, settings.coverAlt || "The Urban Run Community together in Harare", 'fetchpriority="high"')}<div class="home-photo-overlay"></div><div class="home-photo-caption"><strong>Harare.<br>On foot.</strong><p>Powerhouse Urban Run Club.</p></div></div><div class="home-context"><p>${e(settings.announcement || "Shared runs. Local causes. Time together after the finish.")}</p><a class="text-link" href="/first-run">New to the club? Start here ↗</a></div></section>
  <section class="section next-edition"><div class="section-head"><h2>The next starting line.</h2><a class="text-link" href="/events">Explore all runs ↗</a></div><article class="edition-card"><div class="edition-art">${p.coverUrl ? photo(p.coverUrl, p.coverAlt || next.title, 'loading="lazy"') : '<div class="edition-type" aria-hidden="true">LET’S<br>GO.</div>'}<div class="date-stamp"><strong>${e(day)}</strong><span>${e(month)}</span></div><span class="edition-location">HARARE / ZIMBABWE</span></div><div class="edition-copy"><div class="edition-topline"><span>THE NEXT GET-TOGETHER</span><span>URC ↗</span></div><h3>${e(next?.title || "Your next run.")}</h3><p>${e(p.purpose || "A new date, a shared purpose and good company. Confirmed runs appear here when the details are ready.")}</p><div class="edition-facts"><div><span>WHEN</span><strong>${e(next ? formatDate(p.startsAt) : "To be announced")}</strong></div><div><span>MEET US AT</span><strong>${e(p.location || "Harare")}</strong></div></div><div class="edition-bottom">${link(next ? "Explore this run" : "Explore the runs", nextUrl, "green")}<span>Free attendance.<br>Giving is optional.</span></div></div></article></section>
  <section class="section belonging"><div class="belonging-title"><p class="section-index">01 / THE PEOPLE</p><h2>Come for<br>the run.<br><span>Stay for<br>your people.</span></h2><div class="belonging-note"><p>You don’t have to know anyone.<br>That’s how it starts.</p><a class="text-link" href="/club">Meet Powerhouse ↗</a></div></div><div class="belonging-visual">${photo(portrait?.url || cover, portrait?.alt || "The URC community", 'loading="lazy"')}<div class="round-note" aria-hidden="true">GOOD<br>COMPANY.<br>ALL PACES.</div><p>${e(settings.summary || "Movement, wellness and shared experiences in Harare. A familiar face, a new conversation, a reason to come back.")}</p></div></section>
  <section class="section connections-section"><div class="section-head"><h2>The run is only<br>part of the story.</h2><p>People, local collaborations and a shared purpose. There’s more to the day than the distance.</p></div><nav class="connection-rows" aria-label="Life around URC"><a href="/community"><span>01</span><strong>Find your people.</strong><small>Follow the club. Meet the community.</small>${arrow}</a><a href="/partners"><span>02</span><strong>Made possible, together.</strong><small>The collaborations around the run.</small>${arrow}</a><a href="/impact"><span>03</span><strong>A reason to show up.</strong><small>The causes and stories behind our events.</small>${arrow}</a></nav></section>
  ${images.length ? `<section class="section community-contact-sheet"><div class="section-head"><div><p class="section-index">02 / THE MOMENTS</p><h2>A few good<br>reasons to return.</h2></div><a class="text-link" href="/gallery">Inside the gallery ↗</a></div><div class="contact-sheet">${images.map((im, i) => `<a href="/gallery/${e(encodeURIComponent(im.album.slug))}#photo-${im.photoIndex + 1}" class="contact-photo contact-photo-${i}">${photo(im.url, im.alt || "A moment with the URC community", 'loading="lazy"')}<span>URC / ${String(i + 1).padStart(2, "0")} ${arrow}</span></a>`).join("")}</div><p class="image-credit">Community moments shared by URC. Open an album for photo credits.</p></section>` : ""}
  <section class="section first-invitation"><div class="first-invitation-copy"><p class="section-index">03 / YOUR FIRST TIME</p><h2>Your pace.<br>Your people.<br><span>Your first run.</span></h2><p>Come on your own. Bring a friend. There’s no need to have it all figured out before you arrive.</p>${link("Make your first run a good one", "/first-run")}</div><div class="first-invitation-objects"><div class="field-note"><span>BEFORE YOU GO</span><h3>A little preparation.<br>A simpler start.</h3><ul><li>Choose your activity.</li><li>Check the meeting point.</li><li>Bring water and comfortable shoes.</li><li>Say hello to a run lead.</li></ul><a href="/first-run" class="text-link">Your first-run checklist ↗</a></div><div class="route-note">${routeDrawing}<p>One step is a good place to start.</p></div></div></section>`;
}

const paragraph = (text) => `<p>${e(text)}</p>`;
export function eventExperience(x, { state, formatDate, saved, related }) {
  const p = x.payload || {},
    [day, month] = dateParts(p.startsAt);
  const block = (title, text, extra = "") =>
    text
      ? `<section class="event-chapter ${extra}"><h2>${e(title)}</h2>${paragraph(text)}</section>`
      : "";
  return `<div class="wrap event-world"><div class="event-cover-stage">${p.coverUrl ? photo(p.coverUrl, p.coverAlt || x.title, 'class="event-cover-image" fetchpriority="high"') : `<div class="event-poster"><h2>${e(x.title)}</h2><span>POWERHOUSE / HARARE</span></div>`}<div class="event-cover-stamp"><strong>${e(day)}</strong><span>${e(month)}</span></div></div><div class="detail-actions event-actionbar"><button data-save="${e(x.id)}" aria-pressed="${saved}">${saved ? "Saved ✓" : "Save this run"}<span aria-hidden="true">＋</span></button><button id="event-calendar">Add to calendar <span aria-hidden="true">↓</span></button><button id="event-share">Share this run <span aria-hidden="true">↗</span></button><button id="event-poster">Download event poster <span aria-hidden="true">↓</span></button></div><div class="detail-layout event-layout"><div class="detail-main"><section class="event-chapter event-purpose"><span class="section-index">01 / THE IDEA</span><h2>A morning<br>worth showing up for.</h2>${paragraph(p.purpose || "See the organiser’s confirmed event information before reserving.")}</section><section class="event-activities"><div><p class="section-index">02 / YOUR DAY</p><h2>Make it<br>your kind<br>of morning.</h2>${paragraph(p.activities || "Activity details will be confirmed by the organiser.")}</div><div class="activity-paper">${routeDrawing}<h3>${e(p.partnerOffer || "Move together.")}</h3><p>${e(p.offerTerms || "Read the event’s participation details before choosing an activity.")}</p></div></section>${
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
