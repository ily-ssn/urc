import { readFile } from "node:fs/promises";
import { pageHtml } from "../scripts/pages.mjs";
import { publicBackend } from "../lib/backend.js";
import { safeUrl } from "../lib/public.js";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const { section, slug } = req.query ?? {},
    kind = {
      events: "event",
      gallery: "album",
      partners: "partner",
      impact: "recap",
    }[section];
  if (
    !["events", "gallery", "partners", "impact"].includes(section) ||
    !kind ||
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 120
  )
    return res.status(404).end("Page not found.");
  let entry;
  try {
    const source = JSON.parse(
      await readFile(
        new URL("../public/community.json", import.meta.url),
        "utf8",
      ),
    );
    entry = source.entries.find((x) => x.kind === kind && x.slug === slug);
    if (section === "partners" && slug === "luxenova-studios")
      entry = {
        title: "Luxenova Studios",
        payload: {
          contribution:
            "URC creative partner. In-kind design and digital support.",
          coverUrl: "/assets/luxenova-mark.png",
        },
      };
    const db = publicBackend();
    if (db) {
      const { data, error } = await db
        .from("urc_entries")
        .select("published_snapshot")
        .eq("kind", kind)
        .eq("status", "published")
        .eq("slug", slug)
        .maybeSingle();
      if (error && !entry) {
        res.setHeader("Cache-Control", "no-store");
        return res
          .status(503)
          .end("Community updates are temporarily unavailable.");
      }
      if (data?.published_snapshot) entry = data.published_snapshot;
    }
    const p = entry?.payload ?? {},
      origin = "https://powerhouse-urc.vercel.app",
      image = safeUrl(p.coverUrl);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      entry ? "public, max-age=15, s-maxage=30" : "no-store",
    );
    return res.status(entry ? 200 : 404).end(
      pageHtml(section, {
        title: entry ? entry.title + " · URC" : "Page not found · URC",
        description: String(
          p.summary ||
            p.purpose ||
            p.contribution ||
            "Explore the URC community in Harare.",
        ).slice(0, 300),
        image: image ? new URL(image, origin).href : undefined,
        url: origin + "/" + section + "/" + slug,
      }),
    );
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).end("This page could not load. Please try again.");
  }
}
