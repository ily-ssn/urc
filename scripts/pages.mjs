export const pages = {
  home: [
    "Powerhouse Urban Run Club · Harare",
    "A lifestyle in motion. Purpose-led runs, people and experiences in Harare.",
  ],
  events: [
    "Runs",
    "Find upcoming URC runs, distances, causes and partner experiences in Harare.",
  ],
  gallery: [
    "Gallery",
    "Explore URC event albums, photographs and the stories behind each run.",
  ],
  impact: [
    "Impact",
    "The causes behind our runs and verified stories of community giving.",
  ],
  partners: [
    "Partners",
    "Meet the people and businesses contributing to Powerhouse Urban Run Club.",
  ],
  club: [
    "The club",
    "Meet Powerhouse Urban Run Club. A community in Harare, Zimbabwe.",
  ],
  "first-run": [
    "Your first run",
    "A practical guide to joining a URC run, including pace, kit and arrival information.",
  ],
  contact: [
    "Contact",
    "Get in touch about URC runs, volunteering, collaborations and community support.",
  ],
  join: [
    "Join URC",
    "Find your next run or join the URC community. No member account is required to register.",
  ],
  shop: [
    "Shop",
    "URC merchandise and collaboration collections. Availability is confirmed by the club.",
  ],
  account: [
    "Your URC",
    "Your saved runs, account settings and secure event pass access.",
  ],
  community: [
    "Community",
    "Follow URC updates, explore community media and connect with members who choose to share a profile.",
  ],
  privacy: [
    "Privacy and participation",
    "How URC handles event registrations, photographs and optional community contact.",
  ],
};
const wordmark = '<span class="brand-awaiting-art">Urban Run Community</span>';
const escaped = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function pageHtml(key, metadata = {}) {
  const [title, description] = pages[key];
  const nav = [
    ["events", "Runs"],
    ["community", "Community"],
    ["gallery", "Gallery"],
    ["club", "The club"],
    ["partners", "Partners"],
    ["shop", "Shop"],
  ];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f4f3ed"><meta name="description" content="${escaped(metadata.description || description)}"><meta property="og:title" content="${escaped(metadata.title || title)} · URC"><meta property="og:description" content="${escaped(metadata.description || description)}"><meta property="og:type" content="website">${metadata.image ? `<meta property="og:image" content="${escaped(metadata.image)}">` : ""}${metadata.url ? `<link rel="canonical" href="${escaped(metadata.url)}"><meta property="og:url" content="${escaped(metadata.url)}">` : ""}<title>${escaped(metadata.title || (key === "home" ? title : title + " · URC Harare"))}</title><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/race-world.css"><link rel="stylesheet" href="/race-refinement.css"><script type="module" src="/site.js"></script>${["account"].includes(key) ? '<meta name="robots" content="noindex,nofollow">' : ""}</head><body data-page="${key}"><a class="skip" href="#main">Skip to content</a><header class="nav race-navigation"><button class="site-menu-trigger" id="open-site-menu" type="button" aria-label="Navigation menu" aria-haspopup="dialog" aria-controls="site-menu-dialog" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/><circle cx="12" cy="7" r="3"/></svg>Menu</button><a class="wordmark-link" href="/" aria-label="URC home">${wordmark}</a><a href="/join" class="nav-join-club">Join the club <span aria-hidden="true">↗</span></a></header><dialog class="site-menu-dialog" id="site-menu-dialog" aria-labelledby="site-menu-heading"><div class="site-menu-head"><h2 id="site-menu-heading">URC</h2><button type="button" id="close-site-menu" aria-label="Close navigation menu">Close <span aria-hidden="true">×</span></button></div><nav aria-label="Main navigation">${nav.map(([p, t]) => `<a href="/${p}"${key === p ? ' aria-current="page"' : ""}>${t}<span aria-hidden="true">↗</span></a>`).join("")}</nav><div class="site-menu-secondary"><a href="/first-run">Your first run</a><a href="/impact">Our impact</a><a href="/account">Your URC</a><a href="/contact">Contact</a><a href="/studio">Team Studio</a></div></dialog><main id="main"><p class="loading-state" role="status">Loading URC…</p></main><footer class="footer"><div class="footer-invitation"><h2>See you at<br>the starting line.</h2><a href="/events" class="button light">Find your next run <span aria-hidden="true">↗</span></a></div><div class="footer-links"><div><strong>Powerhouse Urban Run Club</strong><p>Harare, Zimbabwe.<br>A lifestyle in motion.</p></div><div><a href="/first-run">Your first run</a><a href="/impact">Our impact</a><a href="/partners">Partner with us</a></div><div><a href="/contact">Contact</a><a href="/privacy">Privacy & participation</a><a href="/studio">Team Studio ↗</a></div><div><span>Independent community.</span><span>Shared purpose.</span></div></div><div class="footer-mark" aria-hidden="true">POWERHOUSE</div><div class="footer-bottom"><span>© ${new Date().getFullYear()} URC</span><a href="https://luxenovastudios.com" target="_blank" rel="noopener noreferrer">Design by Luxenova Studios ↗</a><a href="#main">Back to top ↑</a></div></footer><dialog id="photo-viewer" aria-label="Gallery photo"><div class="viewer-bar"><span id="photo-count"></span><button id="photo-close" aria-label="Close photo">Close ✕</button></div><img id="viewer-image" alt=""><div class="viewer-bar"><button id="photo-previous" aria-label="Previous photo">← Previous</button><p id="viewer-caption"></p><button id="photo-next" aria-label="Next photo">Next →</button></div></dialog><p class="toast" id="site-toast" role="status" hidden></p></body></html>`;
  return html;
}
