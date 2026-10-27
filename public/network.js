import { createClient } from "@supabase/supabase-js";
import { escapeHtml as e, safeUrl } from "../lib/public.js";
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
async function session() {
  const r = await fetch("/api/studio/config");
  if (!r.ok) throw Error("Account connection is unavailable.");
  const config = await r.json();
  if (!config.configured) return { client: null, user: null };
  const client = createClient(config.url, config.publishableKey, {
    auth: { flowType: "pkce" },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  return { client, user };
}
async function people() {
  const r = await fetch("/api/community", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "people" }),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Members could not load.");
  return data;
}
export async function attachFollow(button, type, id, toast) {
  let auth;
  try {
    auth = await session();
  } catch {
    button.textContent = "Sign in to follow";
    button.onclick = () => location.assign("/account");
    return;
  }
  let following = false;
  if (auth.user) {
    const { data } = await auth.client
      .from("urc_follows")
      .select("subject_id")
      .eq("follower_id", auth.user.id)
      .eq("subject_type", type)
      .eq("subject_id", id)
      .maybeSingle();
    following = Boolean(data);
  }
  const update = () => {
    button.textContent = following ? "Following ✓" : "Follow collaborator";
    button.setAttribute("aria-pressed", String(following));
  };
  update();
  button.onclick = async () => {
    if (!auth.user) return location.assign("/account");
    button.disabled = true;
    const { error } = await auth.client.rpc("urc_follow", {
      target_type: type,
      target_id: id,
      following: !following,
    });
    if (error) toast("This follow could not be saved.");
    else {
      following = !following;
      update();
      toast(following ? "Collaborator followed." : "Collaborator unfollowed.");
    }
    button.disabled = false;
  };
}
export async function renderCommunity({
  main,
  entries,
  club,
  card,
  button,
  intro,
  toast,
}) {
  const tab = new URLSearchParams(location.search).get("tab") || "updates",
    segments = location.pathname.split("/").filter(Boolean),
    handle = segments[1] === "member" ? segments[2] : null;
  const tabLabels = [
    ["updates", "Updates"],
    ["runs", "Runs"],
    ["media", "Media"],
    ["following", "Following"],
    ["people", "People"],
  ];
  main.innerHTML = `<div class="community-banner"><img src="/assets/urc-community.jpg" alt="Urban Run Community in Harare"></div><section class="wrap community-profile"><img class="community-emblem" src="/assets/urc-emblem.jpg" alt="URC emblem"><div class="community-profile-head"><div><h1>Urban Run Community.</h1><p>Powerhouse. Harare. Movement, wellness and shared experiences with the people around you.</p><a class="text-link" href="${e(safeUrl(club.eventbriteUrl) || "/events")}" target="_blank" rel="noopener noreferrer">URC on Eventbrite ↗</a></div><button class="button" id="follow-club" disabled>Follow URC</button></div><nav class="community-tabs" aria-label="Community sections">${tabLabels.map(([id, label]) => `<a href="/community?tab=${id}" ${tab === id ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><div id="community-content" class="section"><p role="status">Loading community…</p></div></section>`;
  const target = $("#community-content");
  let auth = { client: null, user: null };
  try {
    auth = await session();
  } catch {}
  let follows = [];
  try {
    const r = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stats" }),
    });
    const data = await r.json();
    if (
      r.ok &&
      data.configured &&
      Number.isFinite(Number(data.stats?.followers))
    ) {
      const count = document.createElement("p");
      count.className = "activity-note";
      count.textContent = `${Number(data.stats.followers).toLocaleString()} ${Number(data.stats.followers) === 1 ? "follower" : "followers"} on the URC website`;
      $(".community-profile-head>div").append(count);
    }
  } catch {}
  if (auth.user) {
    const { data } = await auth.client
      .from("urc_follows")
      .select("subject_type,subject_id")
      .eq("follower_id", auth.user.id);
    follows = data ?? [];
  }
  const follow = $("#follow-club");
  follow.disabled = false;
  const isFollowing = () =>
    follows.some((f) => f.subject_type === "club" && f.subject_id === "urc");
  follow.textContent = isFollowing() ? "Following URC ✓" : "Follow URC";
  follow.setAttribute("aria-pressed", String(isFollowing()));
  follow.onclick = async () => {
    if (!auth.user) {
      location.assign("/account?intent=follow-urc");
      return;
    }
    follow.disabled = true;
    const { error } = await auth.client.rpc("urc_follow", {
      target_type: "club",
      target_id: "urc",
      following: !isFollowing(),
    });
    if (error)
      toast(
        "Following could not be saved. Complete your member profile or try again.",
      );
    else {
      const old = isFollowing();
      follows = follows.filter(
        (f) => !(f.subject_type === "club" && f.subject_id === "urc"),
      );
      if (!old) follows.push({ subject_type: "club", subject_id: "urc" });
      follow.textContent = isFollowing() ? "Following URC ✓" : "Follow URC";
      follow.setAttribute("aria-pressed", String(isFollowing()));
      toast(
        isFollowing()
          ? "You are following URC. Updates are available in Following."
          : "You unfollowed URC.",
      );
    }
    follow.disabled = false;
  };
  if (handle || tab === "people") {
    try {
      const data = await people();
      if (!data.configured) {
        target.innerHTML =
          '<h2>Meet the people.</h2><p class="notice">Member discovery is waiting for the URC account connection. Only members who choose a public profile will appear here.</p>';
        return;
      }
      const list = data.people ?? [];
      if (handle) {
        const person = list.find((p) => p.handle === handle);
        if (!person) {
          target.innerHTML =
            "<h2>Profile unavailable.</h2><p>This member may have chosen a private profile.</p>";
          return;
        }
        document.title = person.display_name + " · URC community";
        target.innerHTML = `<div class="editorial-copy"><div><div class="member-initial" aria-hidden="true">${e(person.display_name.charAt(0))}</div><h2>${e(person.display_name)}</h2><p class="activity-note">@${e(person.handle)}</p></div><div><p>${e(person.bio || "Part of the URC community.")}</p><div class="network-actions"><button class="text-link" id="follow-member">${follows.some((f) => f.subject_type === "member" && f.subject_id === person.user_id) ? "Following ✓" : "Follow member"}</button>${person.connections_enabled ? '<button class="text-link" id="connect-member">Request a connection ↗</button>' : ""}</div><p class="activity-note">Member connections require acceptance. Personal contact details are not shown.</p><a class="text-link" href="/community?tab=people">← Explore members</a></div></div>`;
        $("#follow-member").onclick = async () => {
          if (!auth.user) return location.assign("/account");
          const old = follows.some(
            (f) =>
              f.subject_type === "member" && f.subject_id === person.user_id,
          );
          const { error } = await auth.client.rpc("urc_follow", {
            target_type: "member",
            target_id: person.user_id,
            following: !old,
          });
          if (error) toast("This follow could not be saved.");
          else {
            $("#follow-member").textContent = old
              ? "Follow member"
              : "Following ✓";
            follows = follows.filter(
              (f) =>
                !(
                  f.subject_type === "member" && f.subject_id === person.user_id
                ),
            );
            if (!old)
              follows.push({
                subject_type: "member",
                subject_id: person.user_id,
              });
          }
        };
        if ($("#connect-member"))
          $("#connect-member").onclick = async () => {
            if (!auth.user) return location.assign("/account");
            const b = $("#connect-member");
            b.disabled = true;
            const { error } = await auth.client.rpc("urc_connect", {
              target: person.user_id,
            });
            if (error) {
              toast(
                "A request could not be sent. Check your public profile and existing connections in Your URC.",
              );
              b.disabled = false;
            } else {
              b.textContent = "Request sent";
              toast(
                "Connection request sent. The member can accept or decline.",
              );
            }
          };
      } else {
        target.innerHTML = `<div class="section-head"><h2>Meet the people.</h2><p>Only members who choose to be discoverable appear here.</p></div><label class="sr-only" for="people-search">Search public members</label><input id="people-search" type="search" placeholder="Search members…"><div class="listing" id="people-list"></div><p id="people-status" role="status"></p>`;
        const render = () => {
          const q = $("#people-search").value.toLowerCase(),
            shown = list.filter((p) =>
              [p.display_name, p.handle, p.bio]
                .join(" ")
                .toLowerCase()
                .includes(q),
            );
          $("#people-list").innerHTML = shown
            .map(
              (p) =>
                `<article class="member-card"><div class="member-initial" aria-hidden="true">${e(p.display_name.charAt(0))}</div><h2>${e(p.display_name)}</h2><p>${e(p.bio || "Part of the URC community.")}</p><a class="text-link" href="/community/member/${encodeURIComponent(p.handle)}">Explore profile ↗</a></article>`,
            )
            .join("");
          $("#people-status").textContent = shown.length
            ? `${shown.length} public ${shown.length === 1 ? "member" : "members"}`
            : "No public profiles match yet. You can choose whether to appear here in Your URC.";
        };
        $("#people-search").addEventListener("input", render);
        render();
      }
    } catch (err) {
      target.innerHTML = `<p role="alert">${e(err.message)}</p><a class="text-link" href="/account">Your account ↗</a>`;
    }
    return;
  }
  let list = entries.filter((x) =>
    ["event", "album", "recap"].includes(x.kind),
  );
  if (tab === "runs") list = list.filter((x) => x.kind === "event");
  if (tab === "media") list = list.filter((x) => x.kind === "album");
  if (tab === "following") {
    if (!auth.user) {
      target.innerHTML = `<h2>Your community, together.</h2><p>Sign in to follow URC and members. Following does not subscribe you to marketing messages.</p>${button("Your URC account", "/account")}`;
      return;
    }
    list = isFollowing()
      ? list
      : list.filter((x) =>
          follows.some(
            (f) =>
              f.subject_type === "partner" &&
              (x.id === f.subject_id ||
                x.payload?.partnerIds?.split(",").includes(f.subject_id)),
          ),
        );
  }
  target.innerHTML = `<div class="section-head"><h2>${tab === "following" ? "From your follows." : tab === "media" ? "The community in pictures." : tab === "runs" ? "At the starting line." : "The latest from URC."}</h2><a class="text-link" href="/account">Your profile & connections ↗</a></div>${list.length ? `<div class="listing">${list.map(card).join("")}</div>` : '<p class="notice">There are no published updates in this view yet. Follow URC to bring its runs and media together here.</p>'}<p class="activity-note">This feed contains published club updates. Following lists and connection requests are private to the member account.</p>`;
}
export async function renderMemberSettings({
  root,
  client,
  member,
  onSignOut,
  download,
}) {
  const { data, error } = await client
    .from("urc_member_profiles")
    .select(
      "display_name,handle,bio,public_profile,connections_enabled,news_opt_in",
    )
    .eq("user_id", member.id)
    .maybeSingle();
  if (error) {
    root.innerHTML =
      '<h2>Account setup needed.</h2><p class="notice">You are signed in, but member profile storage is not available yet.</p><button class="text-link" id="member-signout">Sign out</button>';
    $("#member-signout").onclick = onSignOut;
    return;
  }
  root.innerHTML = `<h2>Your member profile.</h2><p class="form-note">${e(member.email || "Signed in")}</p><form class="simple-form member-form"><label>Display name<input name="display_name" maxlength="80" value="${e(data?.display_name || "")}" required autocomplete="nickname"></label><label>Public handle<input name="handle" minlength="4" maxlength="30" pattern="[a-z0-9][a-z0-9-]{2,28}[a-z0-9]" value="${e(data?.handle || "")}" placeholder="Your chosen public name"></label><label>About you<textarea name="bio" maxlength="500">${e(data?.bio || "")}</textarea></label><label><input type="checkbox" name="public_profile" ${data?.public_profile ? "checked" : ""}><span>Make my profile discoverable in Community.</span></label><label><input type="checkbox" name="connections_enabled" ${data?.connections_enabled ? "checked" : ""}><span>Allow connection requests from members with public profiles.</span></label><label><input type="checkbox" name="news_opt_in" ${data?.news_opt_in ? "checked" : ""}><span>I would like optional community news.</span></label><p>Your email and contact preference never appear on your public profile. News permission is saved; email delivery requires the club’s configured email service.</p><button class="button" type="submit">Save profile →</button><p role="status"></p></form><div class="related-links"><button class="text-link" id="member-export">Download my profile</button><button class="text-link" id="member-signout">Sign out</button><a href="/contact?topic=privacy">Request account deletion</a></div><section id="member-network"><p role="status">Loading your connections…</p></section>`;
  let profile = data;
  const form = $("form", root);
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const p = {
      user_id: member.id,
      display_name: form.elements.display_name.value.trim(),
      handle: form.elements.handle.value.trim() || null,
      bio: form.elements.bio.value.trim(),
      public_profile: form.elements.public_profile.checked,
      connections_enabled: form.elements.connections_enabled.checked,
      news_opt_in: form.elements.news_opt_in.checked,
    };
    if (p.public_profile && !p.handle) {
      $("[role=status]", form).textContent =
        "Choose a public handle before making your profile discoverable.";
      return;
    }
    const { error } = await client.from("urc_member_profiles").upsert(p);
    $("[role=status]", form).textContent = error
      ? "Your changes could not save. Check that your handle is available."
      : "Profile saved.";
    if (!error) profile = p;
  };
  $("#member-signout").onclick = onSignOut;
  $("#member-export").onclick = () =>
    download(
      "urc-profile.json",
      JSON.stringify({ email: member.email, profile }, null, 2),
      "application/json",
    );
  const network = $("#member-network");
  const [connections, following, publicPeople, history] = await Promise.all([
    client
      .from("urc_connections")
      .select("id,requester,recipient,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("urc_follows")
      .select("subject_type,subject_id")
      .eq("follower_id", member.id),
    people().catch(() => ({ people: [] })),
    client.rpc("urc_member_passes"),
  ]);
  if (connections.error || following.error) {
    network.innerHTML =
      '<p class="notice">Following and connection storage are not available yet.</p>';
    return;
  }
  const names = new Map((publicPeople.people ?? []).map((p) => [p.user_id, p]));
  network.innerHTML = `<h2>Your connections.</h2>${
    connections.data.length
      ? connections.data
          .map((c) => {
            const other = names.get(
              c.requester === member.id ? c.recipient : c.requester,
            );
            return `<div class="network-item"><strong>${e(other?.display_name || "Private member")}</strong><p>${e(c.status)} · ${c.requester === member.id ? "Sent by you" : "Received"}</p><div class="network-actions">${other ? `<a class="text-link" href="/community/member/${encodeURIComponent(other.handle)}">View profile ↗</a>` : ""}${c.status === "pending" && c.recipient === member.id ? `<button data-reply="${c.id}" data-decision="accepted">Accept</button><button data-reply="${c.id}" data-decision="declined">Decline</button>` : ""}${["pending", "accepted"].includes(c.status) ? `<button data-reply="${c.id}" data-decision="cancelled">${c.status === "accepted" ? "Disconnect" : "Withdraw request"}</button>` : ""}</div></div>`;
          })
          .join("")
      : '<p class="form-note">No connection requests yet. You can choose to receive them in your profile settings.</p>'
  }<h2>Following.</h2><ul class="saved-list">${(following.data ?? []).map((f) => `<li><a href="${f.subject_type === "member" && names.get(f.subject_id) ? "/community/member/" + encodeURIComponent(names.get(f.subject_id).handle) : "/community"}">${e(f.subject_type === "club" ? "Urban Run Community" : names.get(f.subject_id)?.display_name || "Partner profile")}</a><button data-unfollow="${e(f.subject_id)}" data-type="${e(f.subject_type)}">Unfollow</button></li>`).join("")}</ul><a href="/community?tab=people" class="text-link">Explore the community ↗</a>`;
  $$("[data-reply]", network).forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        const { error } = await client.rpc("urc_connection_reply", {
          request_id: b.dataset.reply,
          decision: b.dataset.decision,
        });
        if (error) {
          b.disabled = false;
          b.textContent = "Could not update. Try again.";
        } else
          await renderMemberSettings({
            root,
            client,
            member,
            onSignOut,
            download,
          });
      }),
  );
  $$("[data-unfollow]", network).forEach(
    (b) =>
      (b.onclick = async () => {
        const { error } = await client.rpc("urc_follow", {
          target_type: b.dataset.type,
          target_id: b.dataset.unfollow,
          following: false,
        });
        if (!error) b.closest("li").remove();
      }),
  );
  const past = document.createElement("section");
  past.innerHTML = `<h2>Your event history.</h2><p class="form-note">URC-managed registrations made while signed in appear here. Eventbrite tickets remain in your Eventbrite account.</p>${history.error ? '<p class="notice">Account event history needs the community database update.</p>' : (history.data ?? []).map((p) => `<article class="network-item"><strong>${e(p.event_title)}</strong><p>${e(p.activity)} · ${e(p.status)}${p.checked_in_at ? " · Attended" : ""}</p><div class="network-actions"><a class="text-link" href="/events/${encodeURIComponent(p.event_slug)}">Event details ↗</a>${p.status === "registered" ? `<button data-recover="${e(p.id)}">Replace private pass link</button>` : ""}</div></article>`).join("") || '<p class="form-note">No linked registrations yet.</p>'}`;
  network.append(past);
  $$("[data-recover]", past).forEach(
    (b) =>
      (b.onclick = async () => {
        if (
          !confirm(
            "Create a new private link for this pass? Previous links and QR downloads will stop working.",
          )
        )
          return;
        b.disabled = true;
        try {
          const {
            data: { session },
          } = await client.auth.getSession();
          const r = await fetch("/api/pass", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + session.access_token,
            },
            body: JSON.stringify({
              action: "recover",
              registration: b.dataset.recover,
            }),
          });
          const d = await r.json();
          if (!r.ok || !/^\/pass#[A-Za-z0-9_-]{43}$/.test(d.path ?? ""))
            throw Error();
          location.assign(d.path);
        } catch {
          b.textContent = "Could not replace. Try again.";
          b.disabled = false;
        }
      }),
  );
}
