import { createHash } from "node:crypto";
import { privateResponse, sameOrigin, serviceBackend } from "../lib/backend.js";
export default async function handler(req, res) {
  privateResponse(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!sameOrigin(req))
    return res.status(403).json({ error: "Open your private pass link." });
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
