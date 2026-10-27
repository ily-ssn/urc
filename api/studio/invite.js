import { createClient } from "@supabase/supabase-js";
import {
  publicBackend,
  serviceBackend,
  sameOrigin,
  privateResponse,
} from "../../lib/backend.js";
export default async function handler(req, res) {
  privateResponse(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!sameOrigin(req))
    return res.status(403).json({ error: "Use URC Studio." });
  const admin = serviceBackend(),
    token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  if (!admin || !publicBackend())
    return res.status(503).json({ error: "Team access is not connected yet." });
  if (!token) return res.status(401).json({ error: "Sign in first." });
  try {
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);
    if (error || !user)
      return res
        .status(401)
        .json({ error: "Your session has expired. Sign in again." });
    const { data: staff } = await client
      .from("urc_team")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (staff?.role !== "owner")
      return res
        .status(403)
        .json({ error: "Only the owner can manage team access." });
    if (req.body?.action === "revoke") {
      const id = req.body.userId;
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
        return res.status(400).json({ error: "Choose a valid team member." });
      const { data: target, error: lookupError } = await admin
        .from("urc_team")
        .select("role")
        .eq("user_id", id)
        .maybeSingle();
      if (lookupError || !target)
        return res
          .status(404)
          .json({ error: "This team member could not be found." });
      if (target.role === "owner")
        return res
          .status(403)
          .json({
            error: "Owner accounts cannot be removed through this form.",
          });
      const { error: removeError } = await admin
        .from("urc_team")
        .delete()
        .eq("user_id", id)
        .neq("role", "owner");
      if (removeError)
        return res
          .status(502)
          .json({ error: "Access could not be removed. Please try again." });
      return res.status(200).json({ ok: true });
    }
    const { email, name, role = "editor" } = req.body ?? {};
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 80 ||
      !["editor", "checkin"].includes(role)
    )
      return res
        .status(400)
        .json({ error: "Add a valid name, email and team role." });
    // generateLink does not send email. The owner shares the one-time link privately.
    let type = "invite",
      result = await admin.auth.admin.generateLink({
        type,
        email: email.trim(),
      });
    if (
      result.error?.code === "email_exists" ||
      result.error?.code === "email_address_already_exists"
    ) {
      type = "recovery";
      result = await admin.auth.admin.generateLink({
        type,
        email: email.trim(),
      });
    }
    const data = result.data;
    if (result.error || !data?.user || !data?.properties?.hashed_token)
      return res
        .status(400)
        .json({
          error:
            "A setup link could not be created. Check the email and try again.",
        });
    const { data: existing } = await admin
      .from("urc_team")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (existing?.role === "owner")
      return res
        .status(409)
        .json({
          error:
            "Owner accounts are managed separately; this form cannot replace their access.",
        });
    const { error: roleError } = await admin
      .from("urc_team")
      .upsert({ user_id: data.user.id, display_name: name.trim(), role });
    if (roleError)
      return res
        .status(502)
        .json({
          error:
            "Team access could not be saved. No setup link has been shared.",
        });
    return res
      .status(200)
      .json({
        setupPath:
          "/studio#" +
          new URLSearchParams({
            type,
            token_hash: data.properties.hashed_token,
          }).toString(),
      });
  } catch {
    return res
      .status(502)
      .json({
        error: "Team setup is temporarily unavailable. Please try again.",
      });
  }
}
