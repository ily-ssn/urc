import { randomBytes, createHash, createHmac } from "node:crypto";
import {
  privateResponse,
  sameOrigin,
  serviceBackend,
  verifiedMember,
} from "../lib/backend.js";
export default async function handler(req, res) {
  privateResponse(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!sameOrigin(req))
    return res.status(403).json({ error: "Use the URC registration form." });
  const db = serviceBackend();
  if (!db)
    return res.status(503).json({
      error:
        "Registration is not connected yet. Please check back for the confirmed opening.",
    });
  const {
    eventId,
    name,
    activity,
    email = "",
    phone = "",
    website = "",
    companions = [],
  } = req.body ?? {};
  if (
    website ||
    typeof eventId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(eventId) ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 80 ||
    typeof activity !== "string" ||
    !activity.trim() ||
    activity.length > 100 ||
    typeof email !== "string" ||
    email.length > 254 ||
    (email && !/^\S+@\S+\.\S+$/.test(email)) ||
    typeof phone !== "string" ||
    phone.length > 40 ||
    !Array.isArray(companions) ||
    companions.length > 5 ||
    companions.some(
      (p) =>
        !p ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 80 ||
        typeof p.activity !== "string" ||
        !p.activity.trim() ||
        p.activity.length > 100,
    )
  )
    return res.status(400).json({
      error: "Check your name, activity and optional contact details.",
    });
  const token = randomBytes(32).toString("base64url"),
    hash = createHash("sha256").update(token).digest("hex");
  const ip = String(
    req.headers["x-vercel-forwarded-for"] ??
      req.headers["x-forwarded-for"] ??
      req.socket?.remoteAddress ??
      "unknown",
  )
    .split(",")[0]
    .trim();
  const rateKey = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`urc-registration:${new Date().toISOString().slice(0, 10)}:${ip}`)
    .digest("hex");
  try {
    let member;
    try {
      member = await verifiedMember(req);
    } catch {
      return res
        .status(401)
        .json({
          error:
            "Your account session expired. Sign in again before registering with your account.",
        });
    }
    if (companions.length || member) {
      const participants = [
        {
          name: name.trim(),
          activity,
          email: email.trim(),
          phone: phone.trim(),
        },
        ...companions.map((p) => ({
          name: p.name.trim(),
          activity: p.activity,
          email: "",
          phone: "",
        })),
      ];
      const tokens = participants.map(() =>
        randomBytes(32).toString("base64url"),
      );
      const { data, error } = await db.rpc("urc_register_group", {
        event: eventId,
        participants,
        hashed_tokens: tokens.map((t) =>
          createHash("sha256").update(t).digest("hex"),
        ),
        rate_key: rateKey,
        member: member?.id ?? null,
      });
      if (error)
        return res
          .status(
            /capacity|closed|unavailable/i.test(error.message ?? "")
              ? 409
              : 400,
          )
          .json({
            error:
              "The group could not be registered. Check capacity and activities. No part of this group booking was saved.",
          });
      if (!companions.length)
        return res
          .status(201)
          .json({ passCode: data[0].passCode, path: "/pass#" + tokens[0] });
      return res
        .status(201)
        .json({
          passes: data.map((r, i) => ({
            passCode: r.passCode,
            name: participants[i].name,
            path: "/pass#" + tokens[i],
          })),
        });
    }
    const { data, error } = await db.rpc("urc_register_free_pass", {
      event: eventId,
      participant: name.trim(),
      activity_name: activity,
      contact_email: email.trim(),
      contact_phone: phone.trim(),
      hashed_token: hash,
      rate_key: rateKey,
    });
    if (error) {
      const message = error.message ?? "";
      if (/Too many/.test(message))
        return res
          .status(429)
          .json({ error: "Too many attempts. Try again in about 15 minutes." });
      if (/capacity|closed|unavailable|confirmed registration/.test(message))
        return res.status(409).json({ error: message });
      return res.status(400).json({
        error:
          "Registration could not be completed. Check the event details and try again.",
      });
    }
    return res
      .status(201)
      .json({ passCode: data.passCode, token, path: `/pass#${token}` });
  } catch {
    return res.status(502).json({
      error:
        "Registration is temporarily unavailable. Nothing has been charged.",
    });
  }
}
