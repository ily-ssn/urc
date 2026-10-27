const $ = (s, root = document) => root.querySelector(s),
  make = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
const [section = "events", slug] = location.pathname.split("/").filter(Boolean),
  kinds = {
    events: "event",
    gallery: "album",
    impact: "recap",
    partners: "partner",
  },
  titles = {
    events: [
      "THE NEXT<br>STARTING LINE.",
      "Purpose-led runs, shared experiences and a place for every pace. Attendance is free. Giving is always optional.",
    ],
    gallery: [
      "THE GOOD<br>IN EVERY MILE.",
      "A record of the people, places and moments that make this community.",
    ],
    impact: [
      "RUN WITH<br>A REASON.",
      "Stories from our runs and the confirmed difference we make together.",
    ],
    partners: [
      "GOOD PEOPLE.<br>SHARED PURPOSE.",
      "Meet the people and businesses contributing to URC, and see exactly how they help.",
    ],
  };
const root = $("#explore-content");
let entries = [],
  photos = [],
  photoIndex = 0;
function https(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
function link(text, href, external = false) {
  const a = make("a", text);
  a.href = href;
  if (external) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}
function eventDate(value) {
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Harare",
      }).format(new Date(value)) + " CAT"
    );
  } catch {
    return "Details to be confirmed";
  }
}
function route(entry) {
  return (
    "/" +
    Object.keys(kinds).find((key) => kinds[key] === entry.kind) +
    "/" +
    encodeURIComponent(entry.slug)
  );
}
function empty(title, text) {
  const box = make("div", undefined, "explore-empty");
  box.append(
    make("h2", title),
    make("p", text),
    link("Back to the community →", "/"),
  );
  root.append(box);
}
function card(entry) {
  const p = entry.payload ?? {},
    a = link("", route(entry));
  a.className = "explore-card";
  if (p.coverUrl) {
    const image = make("img");
    image.src = p.coverUrl;
    image.alt = p.photos?.[0]?.alt || entry.title;
    image.loading = "lazy";
    a.append(image);
  }
  a.append(
    make(
      "span",
      entry.kind === "event"
        ? eventDate(p.startsAt)
        : entry.kind === "partner"
          ? (p.partnerType || "Community support").toUpperCase()
          : "URC / HARARE",
      "card-index",
    ),
    make("h2", entry.title.toUpperCase()),
    make("p", p.summary || p.purpose || p.contribution || ""),
    make(
      "span",
      entry.kind === "event"
        ? "Explore this run ↗"
        : entry.kind === "album"
          ? "Open gallery ↗"
          : "Read more ↗",
      "card-action",
    ),
  );
  return a;
}
function block(title, text) {
  const s = make("section");
  s.append(make("h2", title), make("p", text));
  return s;
}
function renderDetail(entry) {
  const p = entry.payload ?? {};
  $("#explore-title").textContent = entry.title.toUpperCase();
  $("#explore-description").textContent =
    entry.kind === "event"
      ? eventDate(p.startsAt)
      : p.summary || p.contribution || "";
  document.title = entry.title + " — URC";
  const detail = make("article", undefined, "explore-detail");
  detail.dataset.theme = ["rose", "ice"].includes(p.theme) ? p.theme : "lime";
  if (p.coverUrl && entry.kind !== "album") {
    const image = make("img", undefined, "event-cover");
    image.src = p.coverUrl;
    image.alt = p.photos?.[0]?.alt || entry.title;
    detail.append(image);
  }
  if (entry.kind === "event") {
    const grid = make("div", undefined, "detail-grid"),
      main = make("div", undefined, "detail-main"),
      aside = make("aside", undefined, "detail-sidebar");
    main.append(block("A RUN WITH PURPOSE.", p.purpose));
    if (p.partnerOffer)
      main.append(
        block(
          p.partnerOffer.toUpperCase(),
          p.offerTerms || "Offer details are being confirmed.",
        ),
      );
    main.append(
      block(
        "COME AS YOU ARE.",
        "Choose your own pace. Arrive a little early, bring water and follow the run lead’s briefing. Registration is separate from any optional donation.",
      ),
    );
    aside.append(
      make("h2", "YOUR PLACE<br>IN THE CREW.".replace("<br>", " ")),
      make("strong", "WHEN"),
      make("p", eventDate(p.startsAt)),
      make("strong", "MEETING POINT"),
      make("p", p.location),
      make("strong", "DISTANCE & PACE"),
      make("p", p.activities),
    );
    if (p.registration === "open" && Date.parse(p.startsAt) > Date.now()) {
      if (p.registrationMode === "free-pass") aside.append(registration(entry));
      else if (https(p.joinUrl)) {
        const a = link("Join this run ↗", p.joinUrl, true);
        a.className = "button button-dark";
        aside.append(a);
      }
    } else
      aside.append(
        make(
          "p",
          p.registration === "closed" || Date.parse(p.startsAt) < Date.now()
            ? "Registration is closed."
            : "Registration details are coming soon.",
        ),
      );
    grid.append(main, aside);
    detail.append(grid);
  } else if (entry.kind === "album") {
    photos = (p.photos ?? []).filter((photo) => photo.url);
    const grid = make("div", undefined, "gallery-grid");
    for (const [index, photo] of photos.entries()) {
      const button = make("button", undefined, "gallery-photo"),
        img = make("img");
      img.src = photo.url;
      img.alt =
        photo.alt || photo.caption || `${entry.title}, photo ${index + 1}`;
      img.loading = "lazy";
      button.append(img);
      if (photo.caption) button.append(make("span", photo.caption));
      button.setAttribute(
        "aria-label",
        `View photo ${index + 1}${photo.caption ? ": " + photo.caption : ""}`,
      );
      button.addEventListener("click", () => openPhoto(index));
      grid.append(button);
    }
    detail.append(grid);
  } else {
    const main = make("div", undefined, "detail-main");
    if (entry.kind === "partner") {
      main.append(block("THEIR CONTRIBUTION.", p.contribution));
      if (https(p.url))
        main.append(link("Visit " + entry.title + " ↗", p.url, true));
    } else {
      if (p.summary) main.append(block("THE STORY.", p.summary));
      if (p.verifiedImpact)
        main.append(block("CONFIRMED IMPACT.", p.verifiedImpact));
    }
    detail.append(main);
  }
  const related = make("div", undefined, "related-links");
  for (const other of entries.filter(
    (e) =>
      e.id !== entry.id &&
      (e.payload?.eventId === entry.id || p.eventId === e.id),
  ))
    related.append(link(other.title + " ↗", route(other)));
  related.append(link("← All " + section, "/" + section));
  detail.append(related);
  root.append(detail);
}
function registration(entry) {
  const form = make("form", undefined, "registration-form");
  form.innerHTML =
    '<h2>YOUR FREE PASS.</h2><label for="participant-name">Your name</label><input id="participant-name" name="name" autocomplete="name" maxlength="80" required><label for="participant-activity">Your run or walk</label><input id="participant-activity" name="activity" maxlength="100" required><label for="participant-email">Email (optional)</label><input id="participant-email" name="email" type="email" autocomplete="email" maxlength="254"><label for="participant-phone">Phone (optional)</label><input id="participant-phone" name="phone" type="tel" autocomplete="tel" maxlength="40"><label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><button type="submit" class="button button-dark">Get my free PDF pass →</button><p class="form-note">We use your name and selected activity to organise this run. Contact details are optional and used only for event updates. Your private pass can be downloaded immediately; no email is required. Giving is optional and never appears on your pass.</p><p class="form-error" role="status"></p>';
  form.elements.activity.placeholder = entry.payload.activities;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("button[type=submit]", form),
      status = form.querySelector("[role=status]");
    button.disabled = true;
    status.textContent = "Saving your place…";
    try {
      const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: entry.id,
            ...Object.fromEntries(new FormData(form)),
          }),
        }),
        data = await response.json();
      if (!response.ok)
        throw Error(
          data.error || "Registration could not finish. Please try again.",
        );
      if (!/^\/pass#[A-Za-z0-9_-]{43}$/.test(data.path))
        throw Error(
          "Your pass link could not be opened. Contact the organiser.",
        );
      location.assign(data.path);
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  });
  return form;
}
// Only static, local markup above uses innerHTML. All published content is inserted as text.
async function init() {
  const config = titles[section] ?? titles.events;
  $("#explore-title").innerHTML = config[0];
  $("#explore-description").textContent = config[1];
  document
    .querySelector(`nav a[href="/${section}"]`)
    ?.setAttribute("aria-current", "page");
  try {
    const response = await fetch("/api/content");
    if (!response.ok)
      throw Error(
        "Community updates could not load. Please try again shortly.",
      );
    const data = await response.json();
    entries = data.entries ?? [];
    if (
      section === "partners" &&
      !entries.some((e) => e.kind === "partner" && /luxenova/i.test(e.title))
    )
      entries.push({
        id: "luxenova",
        kind: "partner",
        title: "Luxenova Studios",
        slug: "luxenova-studios",
        payload: {
          partnerType: "Creative partner",
          contribution:
            "In-kind design and digital support. Luxenova supports URC’s branding, website and digital experience as a contribution to the community.",
          url: "https://luxenovastudios.com",
          coverUrl: "/assets/luxenova-mark.png",
        },
      });
    $("#explore-status").textContent = "";
    if (slug) {
      const entry = entries.find(
        (e) => e.kind === kinds[section] && e.slug === decodeURIComponent(slug),
      );
      if (entry) renderDetail(entry);
      else
        empty(
          "THIS PAGE ISN’T HERE.",
          "It may still be a draft or the address may have changed. Browse the latest published updates.",
        );
      return;
    }
    let items = entries.filter((e) => e.kind === kinds[section]);
    if (section === "events")
      items.sort(
        (a, b) =>
          Date.parse(a.payload?.startsAt) - Date.parse(b.payload?.startsAt),
      );
    for (const entry of items) root.append(card(entry));
    if (!items.length)
      empty(
        section === "events"
          ? "THE NEXT RUN IS TAKING SHAPE."
          : section === "gallery"
            ? "THE MOMENTS ARE STILL AHEAD."
            : "GOOD THINGS TAKE REAL WORK.",
        section === "events"
          ? "Confirmed dates, meeting points, causes and partner experiences will appear here. No event is open for registration yet."
          : section === "gallery"
            ? "Photos will be published here after each run, organised by event. These will be the community’s own moments."
            : "Recaps and verified outcomes will be shared after each run. We don’t publish estimated donation totals as confirmed impact.",
      );
  } catch (error) {
    $("#explore-status").textContent = error.message;
  }
}
function openPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  const photo = photos[photoIndex];
  $("#viewer-image").src = photo.url;
  $("#viewer-image").alt = photo.alt || photo.caption || "URC community photo";
  $("#viewer-caption").textContent = photo.caption || "";
  $("#photo-count").textContent = `${photoIndex + 1} / ${photos.length}`;
  if (!$("#photo-viewer").open) $("#photo-viewer").showModal();
}
$("#photo-close").addEventListener("click", () => $("#photo-viewer").close());
$("#photo-previous").addEventListener("click", () => openPhoto(photoIndex - 1));
$("#photo-next").addEventListener("click", () => openPhoto(photoIndex + 1));
$("#photo-viewer").addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") openPhoto(photoIndex - 1);
  if (event.key === "ArrowRight") openPhoto(photoIndex + 1);
});
init();

let touchStart = null;
$("#photo-viewer").addEventListener(
  "touchstart",
  (event) => {
    touchStart = event.touches[0]
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  },
  { passive: true },
);
$("#photo-viewer").addEventListener(
  "touchend",
  (event) => {
    if (!touchStart || !event.changedTouches[0]) return;
    const dx = event.changedTouches[0].clientX - touchStart.x,
      dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
      openPhoto(photoIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  },
  { passive: true },
);
