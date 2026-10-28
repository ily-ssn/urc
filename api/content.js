import { publicBackend } from "../lib/backend.js";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Use GET." });
  }
  const db = publicBackend();
  if (!db) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ configured: false, entries: [] });
  }
  try {
    const { data, error } = await db
      .from("urc_entries")
      .select("id,kind,published_snapshot,updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const entries = (data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      ...row.published_snapshot,
      updatedAt: row.updated_at,
    }));
    const paths = [
      ...new Set(
        entries
          .flatMap((e) => [
            ...["coverPath", "heroPath", "figuresPath", "prepRunPath", "prepSimplePath", "prepTicketPath"].map(key => e.payload?.[key]),
            ...(e.payload?.photos ?? []).map((p) => p.path),
          ])
          .filter(
            (p) =>
              typeof p === "string" &&
              /^[0-9a-f-]+\/[0-9a-f-]+\.(webp|png|jpg|jpeg)$/i.test(p),
          ),
      ),
    ];
    const urls = new Map();
    for (let i = 0; i < paths.length; i += 50) {
      const { data: signed, error: signError } = await db.storage
        .from("urc-media")
        .createSignedUrls(paths.slice(i, i + 50), 300);
      if (signError) throw signError;
      for (const item of signed ?? [])
        if (item.signedUrl) urls.set(item.path, item.signedUrl);
    }
    for (const entry of entries) {
      for (const key of ["coverPath", "heroPath", "figuresPath", "prepRunPath", "prepSimplePath", "prepTicketPath"])
        if (entry.payload?.[key]) entry.payload[key.replace(/Path$/, "Url")] = urls.get(entry.payload[key]) ?? null;
      if (entry.payload?.photos)
        entry.payload.photos = entry.payload.photos.map((p) => ({
          ...p,
          url: p.path ? urls.get(p.path) ?? null : p.url,
        }));
    }
    res.setHeader("Cache-Control", "public, max-age=15, s-maxage=30");
    return res.status(200).json({ configured: true, entries });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(503)
      .json({ error: "The latest community updates could not be loaded." });
  }
}
