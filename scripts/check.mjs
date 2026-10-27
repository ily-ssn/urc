import { readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
const html = await readFile("public/index.html", "utf8"),
  config = JSON.parse(await readFile("public/club.json", "utf8"));
assert.equal((html.match(/<h1\b/g) || []).length, 1, "One page heading");
assert.equal(config.name, "Powerhouse Urban Run Club");
assert.equal(config.city, "Harare, Zimbabwe");
assert.ok(
  config.joinUrl === null || new URL(config.joinUrl).protocol === "https:",
  "Join link must use HTTPS",
);
for (const path of [
  ...html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:[?#][^"]*)?"/g),
].map((x) => x[1]))
  await access(
    "public" +
      (["/studio", "/pass"].includes(path)
        ? path + ".html"
        : ["/events", "/gallery", "/impact", "/partners"].includes(path)
          ? "/explore.html"
          : path),
  );
for (const path of [...html.matchAll(/href="#([^"\s]+)"/g)].map((x) => x[1]))
  assert.ok(html.includes(`id="${path}"`), `Missing anchor ${path}`);
assert.ok(html.includes("coming soon"), "Honest launch status");
console.log(
  "URC: assets, anchors, document structure and launch configuration checked.",
);
