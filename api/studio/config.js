import { browserConfig } from "../../lib/backend.js";
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Use GET." });
  }
  const config = browserConfig();
  // Deliberately reject a service-role JWT or a secret key in the browser-key setting.
  if (!config) return res.status(200).json({ configured: false });
  return res
    .status(200)
    .json({
      configured: true,
      ...config,
      loginMethod:
        process.env.STUDIO_EMAIL_OTP_ENABLED === "true"
          ? "email-code"
          : "password",
    });
}
