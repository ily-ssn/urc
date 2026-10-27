import { createHash, randomBytes, createHmac } from "node:crypto";
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
    return res.status(403).json({ error: "Open your private pass link." });
  if (req.body?.action === "recover") {
    const id = req.body.registration;
    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
    )
      return res.status(400).json({ error: "Choose a valid registration." });
    try {
      const member = await verifiedMember(req);
      if (!member)
        return res
          .status(401)
          .json({ error: "Sign in to your own URC account." });
      const db = serviceBackend();
      if (!db)
        return res
          .status(503)
          .json({ error: "Pass recovery is not connected." });
      const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
        .update("pass-recovery:" + member.id)
        .digest("hex");
      const claim = await db.rpc("urc_claim_request", { bucket_key: key });
      if (claim.error || !claim.data)
        return res.status(429).json({ error: "Try recovery again later." });
      const token = randomBytes(32).toString("base64url");
      const { data, error } = await db.rpc("urc_replace_member_pass", {
        registration: id,
        member: member.id,
        new_hash: createHash("sha256").update(token).digest("hex"),
      });
      if (error || !data)
        return res
          .status(404)
          .json({
            error: "This registration is not available to your account.",
          });
      return res.status(200).json({ path: "/pass#" + token });
    } catch {
      return res
        .status(401)
        .json({ error: "Sign in again to recover your own pass." });
    }
  }
  const token = req.body?.token;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    return res
      .status(404)
      .json({ error: "This pass link could not be found." });
  const db = serviceBackend();
  if (!db)
    return res
      .status(503)
      .json({ error: "Pass retrieval is not connected yet." });
  try {
    if (req.body?.action === "cancel") {
      const { data, error } = await db.rpc("urc_cancel_pass", {
        hashed_token: createHash("sha256").update(token).digest("hex"),
      });
      if (error)
        return res
          .status(503)
          .json({
            error:
              "This cancellation could not be completed. Contact the organiser.",
          });
      if (!data)
        return res
          .status(409)
          .json({
            error:
              "This registration cannot be cancelled here. Contact the organiser.",
          });
      return res.status(200).json({ cancelled: true });
    }
    const { data, error } = await db.rpc("urc_get_pass", {
      hashed_token: createHash("sha256").update(token).digest("hex"),
    });
    if (error)
      return res
        .status(502)
        .json({ error: "This pass could not be loaded. Try again." });
    if (!data)
      return res
        .status(404)
        .json({ error: "This pass link could not be found." });
    return res.status(200).json({ pass: data });
  } catch {
    return res
      .status(502)
      .json({ error: "Pass retrieval is temporarily unavailable." });
  }
}
