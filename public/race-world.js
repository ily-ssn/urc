/** One short entrance per tab. Content and navigation never wait for it. */
export function mountRaceWorld() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector(".race-hero");
  if (!hero) return;
  let seen = false;
  try {
    seen = sessionStorage.getItem("urc_entrance_v1") === "seen";
  } catch {}
  // Awaiting the supplied downloadable logo master. Never substitute the old Eventbrite identity.
  const suppliedLogo = /^\/assets\/[A-Za-z0-9._-]+\.(png|svg|webp)$/.test(hero.dataset.motionLogo || "") ? hero.dataset.motionLogo : "";
  if (suppliedLogo && !reduced.matches && !seen) {
    const intro = document.createElement("div");
    intro.className = "urc-entrance";
    intro.innerHTML = `<svg class="entrance-portal" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><filter id="urc-logo-alpha" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 3 0 0 -.18"/></filter><filter id="urc-logo-hole" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 3 0 0 -.18"/></filter><filter id="urc-logo-outline" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="0 0 0 0 .12  0 0 0 0 .2  0 0 0 0 .1  0 3 0 0 -.18" result="shape"/><feMorphology in="shape" operator="dilate" radius="1.1" result="dilated"/><feMorphology in="shape" operator="erode" radius=".8" result="inner"/><feComposite in="dilated" in2="inner" operator="out"/></filter><mask id="urc-portal-mask"><rect width="1000" height="700" fill="white"/><g class="entrance-cut"><image href="${suppliedLogo}" x="300" y="150" width="400" height="400" filter="url(#urc-logo-hole)"/></g></mask></defs><rect class="entrance-ground" width="1000" height="700" fill="#d6d7d0" mask="url(#urc-portal-mask)"/><g class="entrance-lettering"><image class="entrance-logo-outline" href="${suppliedLogo}" x="300" y="150" width="400" height="400" filter="url(#urc-logo-outline)"/><image class="entrance-logo-colour" href="${suppliedLogo}" x="300" y="150" width="400" height="400" filter="url(#urc-logo-alpha)"/></g></svg><button type="button" class="entrance-skip">Skip intro ↗</button>`;
    document.body.append(intro);
    document.body.classList.add("entrance-playing");
    let timer;
    const finish = () => {
      clearTimeout(timer);
      reduced.removeEventListener("change", onMotion);
      const focused = intro.contains(document.activeElement);
      intro.remove();
      document.body.classList.remove("entrance-playing");
      document.body.classList.add("home-arrived");
      if (focused) document.querySelector(".wordmark-link")?.focus();
      try {
        sessionStorage.setItem("urc_entrance_v1", "seen");
      } catch {}
    };
    intro.querySelector("button").addEventListener("click", finish);
    const onMotion = () => {
      if (reduced.matches) finish();
    };
    reduced.addEventListener("change", onMotion);
    timer = setTimeout(() => {
      finish();
      reduced.removeEventListener("change", onMotion);
    }, 2800);
  } else document.body.classList.add("home-arrived");

  const section = document.querySelector(".race-manifesto");
  const words = [...document.querySelectorAll(".route-word")];
  if (!section) return;
  let frame = 0,
    previous = -1;
  function update() {
    frame = 0;
    const box = section.getBoundingClientRect();
    const progress = reduced.matches
      ? 1
      : Math.max(
          0,
          Math.min(1, (innerHeight * 0.84 - box.top) / (box.height * 0.76)),
        );
    section.style.setProperty("--route-progress", progress.toFixed(4));
    const count = Math.ceil(progress * words.length);
    if (count !== previous) {
      words.forEach((word, i) => word.classList.toggle("is-filled", i < count));
      previous = count;
    }
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", schedule, { passive: true });
        schedule();
      } else window.removeEventListener("scroll", schedule);
    },
    { rootMargin: "100px" },
  );
  observer.observe(section);
  window.addEventListener("resize", schedule, { passive: true });
  reduced.addEventListener("change", schedule);
  update();
}
