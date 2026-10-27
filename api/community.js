import { createHmac } from "node:crypto";
import {
  publicBackend,
  serviceBackend,
  sameOrigin,
  privateResponse,
} from "../lib/backend.js";
export default async function handler(req, res) {
  privateResponse(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!sameOrigin(req))
    return res.status(403).json({ error: "Use the form on the URC website." });
  const body = req.body;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Buffer.byteLength(JSON.stringify(body)) > 10000
  )
    return res.status(400).json({ error: "Check your request." });
  if (body.action === "stats") {
    const db = publicBackend();
    if (!db) return res.status(200).json({ configured: false, stats: null });
    const { data, error } = await db.rpc("urc_public_stats");
    return error
      ? res.status(503).json({ error: "Community statistics are unavailable." })
      : res.status(200).json({ configured: true, stats: data });
  }
  if (body.action === "people") {
    const db = publicBackend();
    if (!db) return res.status(200).json({ configured: false, people: [] });
    const { data, error } = await db.rpc("urc_people");
    return error
      ? res
          .status(503)
          .json({ error: "The member directory is not available yet." })
      : res.status(200).json({ configured: true, people: data });
  }
  if (body.action !== "request")
    return res.status(400).json({ error: "Choose a valid action." });
  const {
    type,
    name,
    email,
    message = "",
    topic = "general",
    website = "",
    eventId = "",
  } = body;
  if (
    website ||
    !["contact", "feedback", "waitlist"].includes(type) ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 80 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    typeof message !== "string" ||
    message.length > 3000 ||
    (type !== "waitlist" && !message.trim()) ||
    typeof topic !== "string" ||
    ![
      "general",
      "partnership",
      "volunteer",
      "photo-removal",
      "media",
      "privacy",
    ].includes(topic) ||
    typeof eventId !== "string" ||
    (eventId && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(eventId))
  )
    return res
      .status(400)
      .json({ error: "Check your name, email and message." });
  const db = serviceBackend();
  if (!db)
    return res.status(503).json({
      error:
        "The URC message service is not connected yet. Use the organiser’s confirmed Eventbrite contact option.",
    });
  try {
    const ip = String(
      req.headers["x-vercel-forwarded-for"] ??
        req.socket?.remoteAddress ??
        "unknown",
    )
      .split(",")[0]
      .trim();
    const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
      .update("community:" + ip)
      .digest("hex");
    const claim = await db.rpc("urc_claim_request", { bucket_key: key });
    if (claim.error) throw Error();
    if (!claim.data)
      return res
        .status(429)
        .json({ error: "Too many messages. Try again in about 15 minutes." });
    if (type !== "contact") {
      const { data: event, error } = await db
        .from("urc_entries")
        .select("id,status,published_snapshot")
        .eq("id", eventId)
        .eq("kind", "event")
        .eq("status", "published")
        .maybeSingle();
      if (error || !event)
        return res
          .status(400)
          .json({ error: "Choose a published URC-managed event." });
      if (
        type === "waitlist" &&
        event.published_snapshot?.payload?.waitlist !== "yes"
      )
        return res
          .status(409)
          .json({ error: "This event has no open waiting list." });
    }
    const { error } = await db.from("urc_requests").insert({
      kind: type,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      topic,
      event_id: eventId || null,
    });
    if (error) throw Error();
    return res.status(201).json({ saved: true });
  } catch {
    return res.status(503).json({
      error: "Your request could not be saved. Please try again later.",
    });
  }
}
