import { readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
import { pages, pageHtml } from "./pages.mjs";
const config = JSON.parse(await readFile("public/club.json", "utf8"));
assert.equal(config.name, "Powerhouse Urban Run Club");
assert.equal(config.city, "Harare, Zimbabwe");
assert.ok(
  config.joinUrl === null || new URL(config.joinUrl).protocol === "https:",
);
for (const key of Object.keys(pages)) {
  const html = pageHtml(key);
  assert.ok(html.includes(`data-page="${key}"`));
  assert.ok(html.includes('<main id="main">'));
  assert.ok(html.includes('name="description"'));
  for (const [, p] of html.matchAll(
    /(?:src|href)="(\/[^"#?]+)(?:[?#][^"]*)?"/g,
  )) {
    if (
      Object.keys(pages).includes(p.slice(1)) ||
      ["/studio", "/pass", "/"].includes(p)
    )
      continue;
    await access("public" + p);
  }
}
const data = JSON.parse(await readFile("public/community.json", "utf8"));
for (const x of data.entries) {
  assert.match(x.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  for (const p of [
    x.payload.coverUrl,
    ...(x.payload.photos ?? []).map((p) => p.url),
  ].filter(Boolean)) {
    if (p.startsWith("/")) await access("public" + p);
  }
  if (x.kind === "event") {
    assert.ok(Number.isFinite(Date.parse(x.payload.startsAt)));
    assert.equal(new URL(x.payload.joinUrl).protocol, "https:");
  }
}
console.log(
  `PASS: ${Object.keys(pages).length} page documents, local assets, verified source routes and community configuration.`,
);
