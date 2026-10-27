import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import QRCode from "qrcode";
const accents = {
  lime: [0.486, 0.855, 0.31],
  rose: [0.906, 0.682, 0.769],
  ice: [0.69, 0.863, 0.886],
};
export async function makePassPdf(
  pass,
  link,
  preview = false,
  participantImage = null,
) {
  const doc = await PDFDocument.create(),
    page = doc.addPage([842, 595]),
    bold = await doc.embedFont(StandardFonts.HelveticaBold),
    normal = await doc.embedFont(StandardFonts.Helvetica);
  doc.setTitle(
    `${preview ? "Design preview — " : ""}${pass.event.title} — URC event pass`,
  );
  doc.setAuthor("Powerhouse Urban Run Club");
  doc.setSubject("Free attendance pass; donation information is not included.");
  const accent = rgb(...(accents[pass.event.payload.theme] ?? accents.lime)),
    ink = rgb(0.067, 0.082, 0.059),
    paper = rgb(0.965, 0.965, 0.941),
    muted = rgb(0.69, 0.73, 0.65);
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: ink });
  page.drawRectangle({ x: 615, y: 0, width: 227, height: 595, color: paper });
  page.drawText("URC", { x: 36, y: 520, size: 58, font: bold, color: accent });
  page.drawText("POWERHOUSE URBAN RUN CLUB", {
    x: 36,
    y: 499,
    size: 10,
    font: bold,
    color: paper,
  });
  page.drawText("FREE EVENT PASS", {
    x: 36,
    y: 454,
    size: 10,
    font: bold,
    color: accent,
  });
  function lines(text, max, size, font) {
    const words = String(text)
        .replace(/[^\x20-\x7E\u00a0-\u00ff]/g, " ")
        .split(/\s+/),
      out = [];
    let line = "";
    for (const word of words) {
      const next = line ? line + " " + word : word;
      if (line && font.widthOfTextAtSize(next, size) > max) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  }
  let y = 412;
  for (const line of lines(pass.event.title.toUpperCase(), 535, 36, bold).slice(
    0,
    3,
  )) {
    page.drawText(line, { x: 36, y, size: 36, font: bold, color: paper });
    y -= 41;
  }
  const date = pass.event.payload.startsAt
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Harare",
      }).format(new Date(pass.event.payload.startsAt)) + " CAT"
    : "DATE TO BE CONFIRMED";
  y -= 17;
  for (const line of lines(date, 520, 12, normal)) {
    page.drawText(line, { x: 36, y, size: 12, font: normal, color: muted });
    y -= 18;
  }
  for (const line of lines(
    pass.event.payload.location ?? "Harare, Zimbabwe",
    520,
    12,
    normal,
  )) {
    page.drawText(line, { x: 36, y, size: 12, font: normal, color: muted });
    y -= 18;
  }
  page.drawLine({
    start: { x: 36, y: 198 },
    end: { x: 578, y: 198 },
    color: rgb(0.25, 0.3, 0.21),
    thickness: 1,
  });
  page.drawText("PARTICIPANT", {
    x: 36,
    y: 172,
    size: 9,
    font: bold,
    color: accent,
  });
  if (participantImage) {
    const name = await doc.embedPng(participantImage);
    page.drawImage(name, { x: 36, y: 129, width: 535, height: 40 });
  } else {
    const name = String(pass.name).replace(/[^\x20-\x7E\u00a0-\u00ff]/g, "?");
    let size = 25;
    while (size > 13 && bold.widthOfTextAtSize(name, size) > 535) size--;
    page.drawText(name, { x: 36, y: 137, size, font: bold, color: paper });
  }
  page.drawText(lines(pass.activity, 530, 11, normal)[0] ?? "", {
    x: 36,
    y: 112,
    size: 11,
    font: normal,
    color: muted,
  });
  page.drawText("A LIFESTYLE IN MOTION.", {
    x: 36,
    y: 42,
    size: 10,
    font: bold,
    color: accent,
  });
  for (let yy = 18; yy < 580; yy += 14)
    page.drawLine({
      start: { x: 615, y: yy },
      end: { x: 615, y: yy + 5 },
      color: rgb(0.65, 0.7, 0.59),
      thickness: 1,
    });
  const qr = await QRCode.toDataURL(link, {
      width: 450,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#11150f", light: "#f5f4ee" },
    }),
    image = await doc.embedPng(qr);
  page.drawText("YOUR STARTING LINE", {
    x: 640,
    y: 526,
    size: 11,
    font: bold,
    color: ink,
  });
  page.drawText("HARARE, ZIMBABWE", {
    x: 640,
    y: 507,
    size: 9,
    font: normal,
    color: rgb(0.4, 0.45, 0.36),
  });
  page.drawImage(image, { x: 636, y: 252, width: 185, height: 185 });
  page.drawText(pass.passCode, {
    x: 641,
    y: 232,
    size: 13,
    font: bold,
    color: ink,
  });
  let noteY = 191;
  for (const line of lines(
    "Attendance is free. Giving is optional. Everyone belongs.",
    168,
    11,
    normal,
  )) {
    page.drawText(line, {
      x: 641,
      y: noteY,
      size: 11,
      font: normal,
      color: rgb(0.3, 0.36, 0.26),
    });
    noteY -= 18;
  }
  page.drawText("SHOW YOUR QR AT CHECK-IN", {
    x: 641,
    y: 75,
    size: 8,
    font: bold,
    color: ink,
  });
  page.drawText("Keep this pass link private.", {
    x: 641,
    y: 54,
    size: 8,
    font: normal,
    color: rgb(0.4, 0.45, 0.36),
  });
  if (preview) {
    page.drawRectangle({ x: 0, y: 0, width: 842, height: 24, color: accent });
    page.drawText("DESIGN PREVIEW — NOT VALID FOR ENTRY", {
      x: 36,
      y: 8,
      size: 10,
      font: bold,
      color: ink,
    });
    page.drawText("PREVIEW", {
      x: 85,
      y: 220,
      size: 79,
      font: bold,
      color: paper,
      opacity: 0.12,
      rotate: degrees(18),
    });
  }
  return doc.save();
}
