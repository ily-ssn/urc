import QRCode from "qrcode";
import { makePassPdf } from "../lib/pass-pdf.js";
import { calendarFile, safeUrl } from "../lib/public.js";
const $ = (s) => document.querySelector(s),
  preview = new URL(location.href).searchParams.get("preview") === "1";
let pass = null,
  privateLink = location.href;
async function init() {
  try {
    if (preview) {
      pass = {
        passCode: "PREVIEW-URC",
        name: "Your name goes here",
        activity: "Your selected run or walk",
        status: "registered",
        event: {
          title: "Your next URC run",
          status: "published",
          payload: {
            theme: "lime",
            location: "Harare, Zimbabwe",
            startsAt: null,
          },
        },
      };
      privateLink = new URL("/events", location.origin).href;
      $("#pass-notice").textContent =
        "Ticket design preview. No registration has been created. This PDF is not valid for entry.";
      $("#pass-notice").classList.add("preview");
    } else {
      const token = location.hash.slice(1);
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw Error(
          "Open the full private link you received after registering.",
        );
      const response = await fetch("/api/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Your pass could not be loaded.");
      pass = data.pass;
      if (pass.status !== "registered" || pass.event.status !== "published")
        throw Error(
          "This pass or event is no longer active. Contact the organiser for the latest update.",
        );
      $("#pass-notice").textContent =
        "You’re registered. Download your PDF or save your private pass link.";
    }
    const event = pass.event;
    $("#pass-event-link").href =
      "/events/" + encodeURIComponent(event.slug ?? "");
    $("#pass-day-information").textContent =
      event.payload.itinerary ||
      event.payload.arrival ||
      "Check the event page for the latest arrival and schedule information.";
    if (safeUrl(event.payload.mapUrl)) {
      $("#pass-map-link").href = safeUrl(event.payload.mapUrl);
      $("#pass-map-link").hidden = false;
      $("#pass-map-link").target = "_blank";
      $("#pass-map-link").rel = "noopener noreferrer";
    }
    $("#pass-calendar").hidden = !event.payload.startsAt;
    $("#cancel-pass").disabled = preview;
    $("#digital-pass").dataset.theme = ["lime", "rose", "ice"].includes(
      event.payload.theme,
    )
      ? event.payload.theme
      : "lime";
    $("#pass-event-title").textContent = event.title;
    $("#pass-name").textContent = pass.name;
    $("#pass-activity").textContent = pass.activity;
    $("#pass-code").textContent = pass.passCode;
    $("#pass-location").textContent = event.payload.location;
    $("#pass-date").textContent = event.payload.startsAt
      ? new Intl.DateTimeFormat("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Harare",
        }).format(new Date(event.payload.startsAt)) + " CAT"
      : "Date and meeting details to be confirmed";
    await QRCode.toCanvas($("#pass-qr"), privateLink, {
      width: 290,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#11150f", light: "#f5f4ee" },
    });
    $("#pass-card").hidden = false;
  } catch (error) {
    $("#pass-notice").textContent = error.message;
  }
}
$("#download-pass").addEventListener("click", async () => {
  if (!pass) return;
  const button = $("#download-pass");
  button.disabled = true;
  $("#pass-message").textContent = "Preparing your PDF…";
  try {
    await document.fonts.ready;
    const nameCanvas = document.createElement("canvas");
    nameCanvas.width = 1605;
    nameCanvas.height = 120;
    const context = nameCanvas.getContext("2d");
    context.font = "700 75px Manrope, sans-serif";
    context.fillStyle = "#f6f6f0";
    context.textBaseline = "middle";
    context.fillText(pass.name, 0, 62, 1605);
    const bytes = await makePassPdf(
        pass,
        privateLink,
        preview,
        nameCanvas.toDataURL("image/png"),
      ),
      url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })),
      a = document.createElement("a");
    a.href = url;
    a.download = `urc-${pass.passCode.toLowerCase()}${preview ? "-preview" : ""}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    $("#pass-message").textContent =
      "Your PDF has been sent to your browser’s downloads.";
  } catch {
    $("#pass-message").textContent =
      "The PDF could not be prepared. Try again; your pass link is still here.";
  } finally {
    button.disabled = false;
  }
});
$("#pass-calendar").addEventListener("click", () => {
  if (!pass) return;
  const url = URL.createObjectURL(
      new Blob(
        [
          calendarFile(
            { ...pass.event, id: pass.event.id || pass.passCode },
            location.origin,
          ),
        ],
        { type: "text/calendar" },
      ),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "urc-event.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});
$("#cancel-pass").addEventListener("click", async () => {
  if (
    preview ||
    !pass ||
    !confirm("Cancel your place at this run? Your pass will stop being valid.")
  )
    return;
  const b = $("#cancel-pass");
  b.disabled = true;
  try {
    const response = await fetch("/api/pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: location.hash.slice(1), action: "cancel" }),
    });
    const data = await response.json();
    if (!response.ok)
      throw Error(data.error || "Cancellation could not finish.");
    $("#pass-notice").textContent =
      "Your registration is cancelled. Your old QR pass is no longer valid.";
    $("#download-pass").disabled = true;
    $("#pass-card").hidden = true;
  } catch (err) {
    $("#pass-message").textContent = err.message;
    b.disabled = false;
  }
});
$("#copy-pass").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("#pass-message").textContent = preview
      ? "Preview link copied."
      : "Private link copied. Only share it with someone you trust.";
  } catch {
    $("#pass-message").textContent =
      "Copy the full address from your browser to keep this pass link.";
  }
});
init();
