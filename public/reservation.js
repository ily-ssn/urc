import { createClient } from "@supabase/supabase-js";
import { activityOptions, escapeHtml as e, safeUrl } from "../lib/public.js";

export function mountReservation(target, event) {
  const p = event.payload || {},
    options = activityOptions(p);
  target.innerHTML =
    '<button class="button reserve-trigger" type="button">Reserve a spot <span aria-hidden="true">↗</span></button><p class="reservation-hint">Choose your experience. Keep your ticket.</p>';
  if (p.registrationMode === "urc-pending")
    target.querySelector(".reservation-hint").textContent =
      "Reservations open soon. Explore the experiences below.";
  const trigger = target.querySelector("button");
  trigger.onclick = () => {
    const dialog = document.createElement("dialog");
    dialog.className = "reservation-dialog";
    dialog.setAttribute("aria-labelledby", "reservation-title");
    const quantities = options.map((_, i) => (i === 0 ? 1 : 0));
    let selections = [],
      participants = [],
      step = 1,
      busy = false,
      connected = false,
      authorization = "",
      memberEmail = "";
    dialog.innerHTML = `<div class="reservation-dialog-head"><span>POWERHOUSE / HARARE</span><button type="button" id="close-reservation" aria-label="Close reservation">Close ✕</button></div><div class="reservation-dialog-body"><div class="reservation-heading"><p id="reservation-step">1 / Choose your experience</p><h2 id="reservation-title">${e(event.title)}</h2><p>Free attendance. Giving is optional.</p></div><div id="reservation-body"></div><p id="reservation-status" role="status"></p></div>`;
    document.body.append(dialog);
    const $ = (q) => dialog.querySelector(q);
    function pendingNotice(message) {
      const status = $("#reservation-status");
      status.textContent = message;
      const source = safeUrl(p.sourceUrl || p.joinUrl);
      if (source) {
        const link = document.createElement("a");
        link.href = source;
        link.className = "text-link";
        link.textContent = "Current organiser listing ↗";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        status.append(document.createElement("br"), link);
      }
    }
    $("#close-reservation").onclick = () => {
      if (!busy) dialog.close();
    };
    dialog.addEventListener("cancel", (ev) => {
      if (busy) ev.preventDefault();
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      trigger.focus();
    });
    function selected() {
      return options.flatMap((option, i) =>
        Array.from({ length: quantities[i] }, () => option),
      );
    }
    function stepOne() {
      step = 1;
      $("#reservation-step").textContent = "1 / Choose your experience";
      $("#reservation-body").innerHTML =
        `<div class="ticket-choices">${options.map((option, i) => `<article class="ticket-choice"><div><h3>${e(option)}</h3><p>General admission · Free</p></div><div class="ticket-quantity"><button type="button" data-minus="${i}" aria-label="Remove ${e(option)}">−</button><output id="quantity-${i}" aria-label="${e(option)} quantity">${quantities[i]}</output><button type="button" data-plus="${i}" aria-label="Add ${e(option)}">+</button></div></article>`).join("")}</div><p class="form-note">Up to six people per reservation. Each person gets their own private pass.</p><div class="reservation-total"><span>Total</span><strong>$0 <small>Free</small></strong></div><button class="button" type="button" id="continue-reservation">Continue to your details →</button><p class="form-note">No payment details. No account required.</p>`;
      function update() {
        quantities.forEach((n, i) => {
          $("#quantity-" + i).value = n;
          $("[data-minus='" + i + "']").disabled = n === 0;
          $("[data-plus='" + i + "']").disabled = selected().length >= 6;
        });
        $("#continue-reservation").disabled = selected().length === 0;
      }
      dialog.querySelectorAll("[data-plus]").forEach(
        (b) =>
          (b.onclick = () => {
            if (selected().length < 6) quantities[Number(b.dataset.plus)]++;
            update();
          }),
      );
      dialog.querySelectorAll("[data-minus]").forEach(
        (b) =>
          (b.onclick = () => {
            const i = Number(b.dataset.minus);
            quantities[i] = Math.max(0, quantities[i] - 1);
            update();
          }),
      );
      $("#continue-reservation").onclick = () => {
        selections = selected();
        stepTwo();
      };
      update();
    }
    function stepTwo() {
      step = 2;
      $("#reservation-step").textContent = "2 / Your details";
      $("#reservation-body").innerHTML =
        `<button class="text-link" type="button" id="reservation-back">← Change experiences</button><form id="guest-reservation" class="guest-reservation"><a class="text-link" href="/account">Have an account? Sign in for a faster visit ↗</a>${selections.map((option, i) => `<fieldset><legend>${i === 0 ? "Your ticket" : "Participant " + (i + 1)} <span>${e(option)}</span></legend><div class="name-fields"><label>First name<input name="first-${i}" autocomplete="${i === 0 ? "given-name" : "off"}" maxlength="39" required value="${e(participants[i]?.first || "")}"></label><label>Last name<input name="last-${i}" autocomplete="${i === 0 ? "family-name" : "off"}" maxlength="39" required value="${e(participants[i]?.last || "")}"></label></div></fieldset>`).join("")}<label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" required value="${e(participants[0]?.email || "")}"></label><label>Phone number, optional<input name="phone" type="tel" autocomplete="tel" maxlength="40" value="${e(participants[0]?.phone || "")}"></label><label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><div class="ticket-receipt"><div><strong>${selections.length} ${selections.length === 1 ? "ticket" : "tickets"}</strong><span>$0</span></div><p>${e(event.title)} · ${e(p.location)}</p><p>Your printable PDF and private pass link appear after a successful reservation. Email delivery is not required.</p></div><label class="reservation-consent"><input name="participation" type="checkbox" required><span>I have read the <a class="text-link" href="/privacy" target="_blank" rel="noopener noreferrer">participation and privacy information</a>.</span></label><button class="button" type="submit" id="confirm-reservation" ${connected ? "" : "disabled"}>Confirm free reservation →</button><p class="form-note">Contact details are for this booking. This does not subscribe you to marketing.</p></form>`;
      $("#reservation-back").onclick = () => {
        keepDetails();
        stepOne();
      };
      if (memberEmail && !$("[name=email]").value)
        $("[name=email]").value = memberEmail;
      if (!connected)
        pendingNotice(
          "URC reservations are not open on this website yet. No place has been reserved and no details have been sent. Please check back before the event.",
        );
      $("#guest-reservation").onsubmit = submit;
      $("[name=first-0]").focus();
    }
    function keepDetails() {
      const form = $("#guest-reservation");
      if (!form) return;
      participants = selections.map((activity, i) => ({
        first: form.elements["first-" + i].value,
        last: form.elements["last-" + i].value,
        activity,
        email: i === 0 ? form.elements.email.value : "",
        phone: i === 0 ? form.elements.phone.value : "",
      }));
    }
    async function submit(ev) {
      ev.preventDefault();
      if (!connected || busy || !$("#guest-reservation").reportValidity())
        return;
      keepDetails();
      const form = $("#guest-reservation");
      busy = true;
      $("#confirm-reservation").disabled = true;
      $("#close-reservation").disabled = true;
      $("#reservation-back").disabled = true;
      $("#reservation-status").textContent = "Reserving your places…";
      try {
        const payload = {
          eventId: event.id,
          name:
            participants[0].first.trim() + " " + participants[0].last.trim(),
          activity: participants[0].activity,
          email: participants[0].email,
          phone: participants[0].phone,
          website: form.elements.website.value,
          companions: participants.slice(1).map((person) => ({
            name: person.first.trim() + " " + person.last.trim(),
            activity: person.activity,
          })),
        };
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authorization ? { Authorization: authorization } : {}),
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok)
          throw Error(
            data.error ||
              "Your reservation could not be saved. Please try again.",
          );
        const passes = data.passes || [{ path: data.path, name: payload.name }];
        if (
          !passes.length ||
          passes.some((pass) => !/^\/pass#[A-Za-z0-9_-]{43}$/.test(pass.path))
        )
          throw Error(
            "Your ticket link could not be opened. Contact the organiser before making another reservation.",
          );
        $("#reservation-step").textContent = "3 / Your tickets";
        $("#reservation-body").innerHTML =
          `<div class="reservation-success"><p>Your places are reserved.</p><h3>See you at<br>the starting line.</h3><p>${e(event.title)} · ${e(p.location)}</p><ul>${passes.map((pass) => `<li><a class="button" href="${e(pass.path)}">${e(pass.name)} · Open your ticket ↗</a></li>`).join("")}</ul><p>Open each private pass to download its PDF. Keep the links safe; they provide access to your tickets.</p></div>`;
        $("#reservation-status").textContent =
          "Reservation saved. Nothing has been charged.";
      } catch (error) {
        $("#reservation-status").textContent = error.message;
        if ($("#confirm-reservation"))
          $("#confirm-reservation").disabled = false;
      } finally {
        busy = false;
        $("#close-reservation").disabled = false;
        if ($("#reservation-back")) $("#reservation-back").disabled = false;
      }
    }
    stepOne();
    if (p.registrationMode === "urc-pending")
      pendingNotice(
        "Reservations open soon. Choosing an experience here does not reserve a place yet.",
      );
    dialog.showModal();
    void (async () => {
      try {
        const response = await fetch("/api/studio/config", {
            signal: AbortSignal.timeout(8000),
          }),
          config = await response.json();
        connected = Boolean(
          config.configured &&
            p.registrationMode === "free-pass" &&
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(event.id),
        );
        if (connected) {
          const client = createClient(config.url, config.publishableKey);
          const {
            data: { session },
          } = await client.auth.getSession();
          if (session) {
            authorization = "Bearer " + session.access_token;
            memberEmail = session.user.email || "";
          }
        }
      } catch {
        connected = false;
      }
      if (!dialog.isConnected) return;
      if (step === 2 && connected) {
        $("#confirm-reservation").disabled = false;
        if (memberEmail && !$("[name=email]").value)
          $("[name=email]").value = memberEmail;
        $("#reservation-status").textContent =
          "Your PDF will be available immediately after reservation.";
      }
    })();
  };
}
