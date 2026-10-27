export const ENTRY_TYPES = ["event", "album", "recap", "partner", "page"];
export function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}
export function isHttps(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
export function entryIssues(entry, publishing = false) {
  const issues = [],
    p = entry.payload ?? {};
  if (!ENTRY_TYPES.includes(entry.kind))
    issues.push("Choose a valid content type.");
  if (!entry.title?.trim()) issues.push("Add a title.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug ?? ""))
    issues.push("Use a valid web address.");
  for (const field of ["joinUrl", "url", "offerUrl"])
    if (p[field] && !isHttps(p[field]))
      issues.push("Links must start with https://.");
  if (!publishing) return issues;
  if (entry.kind === "event") {
    if (!p.startsAt || !Number.isFinite(Date.parse(p.startsAt)))
      issues.push("Add a confirmed date and time.");
    if (p.capacity && !/^[1-9][0-9]{0,5}$/.test(String(p.capacity)))
      issues.push(
        "Use a participant limit between 1 and 999999, or leave it empty.",
      );
    if (!p.location?.trim()) issues.push("Add the confirmed meeting point.");
    if (!p.activities?.trim())
      issues.push("Add the run or walk distances and pace.");
    if (!p.purpose?.trim())
      issues.push("Explain the event’s purpose and cause.");
    if (p.partnerOffer && !p.offerTerms?.trim())
      issues.push("Include the partner offer’s terms and validity.");
    if (
      p.registration === "open" &&
      p.registrationMode !== "free-pass" &&
      !isHttps(p.joinUrl)
    )
      issues.push("An open event needs a verified registration link.");
  }
  if (entry.kind === "album" && !p.photos?.length)
    issues.push("Add at least one photo.");
  if (entry.kind === "album" && !p.eventId)
    issues.push("Link the album to its run.");
  if (entry.kind === "recap" && !p.summary?.trim())
    issues.push("Add the event summary.");
  if (entry.kind === "partner" && !p.contribution?.trim())
    issues.push("Explain what this partner contributes to URC.");
  return issues;
}
