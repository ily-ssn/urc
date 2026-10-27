export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function safeUrl(value) {
  if (typeof value !== "string" || /[\r\n]/.test(value)) return "";
  if (/^\/(?!\/)/.test(value)) return value;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
  } catch {
    return "";
  }
}
export function activityOptions(payload) {
  return String(payload.activityOptions || payload.activities || "")
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}
export function estimatedMinutes(distance, pace) {
  const km = Number(distance),
    minutesPerKm = Number(pace);
  return Number.isFinite(km) &&
    km > 0 &&
    km <= 100 &&
    Number.isFinite(minutesPerKm) &&
    minutesPerKm >= 2 &&
    minutesPerKm <= 30
    ? Math.round(km * minutesPerKm)
    : null;
}
export function eventState(entry) {
  const p = entry.payload ?? {};
  if (["cancelled", "postponed"].includes(p.eventStatus)) return p.eventStatus;
  return Number.isFinite(Date.parse(p.startsAt)) &&
    Date.parse(p.startsAt) < Date.now()
    ? "past"
    : "upcoming";
}
export function calendarFile(entry, origin) {
  const p = entry.payload ?? {},
    start = new Date(p.startsAt);
  if (!Number.isFinite(start.getTime()))
    throw Error("This event has no confirmed date.");
  const stamp = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const text = (v) =>
    String(v ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/[\r\n]+/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const end = new Date(
    Number.isFinite(Date.parse(p.endsAt))
      ? p.endsAt
      : start.getTime() + 2 * 3600000,
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//URC//Harare Runs//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${text(entry.id)}@urc`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(entry.title)}`,
    `LOCATION:${text(p.location)}`,
    `DESCRIPTION:${text(p.purpose)}`,
    `URL:${origin}/events/${encodeURIComponent(entry.slug)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
