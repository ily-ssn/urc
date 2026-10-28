import { entranceLetters, entranceWidth } from "./entrance-letters.js";
/** Public pages share the same entrance; internal navigation uses a shorter cut. */
export function mountPageEntrance({ quick } = {}) {
  if (document.querySelector(".urc-entrance")) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const navigation = performance.getEntriesByType("navigation")[0]?.type;
  let internal = false;
  try { internal = new URL(document.referrer).origin === location.origin; } catch {}
  const fullEntrance = quick !== true && document.body.dataset.page === "home" &&
    (navigation === "reload" || (navigation !== "back_forward" && !internal));
  if (!reduced.matches) {
    const intro = document.createElement("div");
    intro.className = `urc-entrance lettering-entrance ${fullEntrance ? "entrance-full" : "entrance-quick"}`;
    const letteringWidth = Math.min(410, 700 * innerWidth / innerHeight * .78);
    const scale = letteringWidth / entranceWidth;
    const letters = entranceLetters.map((letter, i) => `<path class="entrance-letter entrance-letter-${i}" d="${letter.d}" transform="translate(${letter.x} 0)" pathLength="1"/>`).join("");
    const holes = entranceLetters.map(letter => `<path d="${letter.d}" transform="translate(${letter.x} 0)" fill="black"/>`).join("");
    const transform = `translate(${500 - letteringWidth / 2} ${350 + 80 * letteringWidth / 410}) scale(${scale} -${scale})`;
    intro.innerHTML = `<svg class="entrance-portal" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><mask id="urc-portal-mask"><rect width="1000" height="700" fill="white"/><g class="entrance-cut"><g transform="${transform}">${holes}</g></g></mask></defs><rect width="1000" height="700" fill="#181a19" mask="url(#urc-portal-mask)"/><g transform="${transform}">${letters}</g></svg><button type="button" class="entrance-skip">Skip intro</button>`;
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
    };
    intro.querySelector("button").addEventListener("click", finish);
    const onMotion = () => {
      if (reduced.matches) finish();
    };
    reduced.addEventListener("change", onMotion);
    timer = setTimeout(() => {
      finish();
      reduced.removeEventListener("change", onMotion);
    }, fullEntrance ? 4500 : 1700);
  } else document.body.classList.add("home-arrived");
}

export function mountRaceWorld() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector(".race-hero");
  if (!hero) return;
  const section = document.querySelector(".race-manifesto");
  const words = [...document.querySelectorAll(".route-word")];
  const lineup = document.querySelector(".race-lineup");
  const chapters = [...document.querySelectorAll(".feeling-chapter")];
  const cameraRoll = document.querySelector(".race-camera-roll");
  const movingRunners = chapters.map((chapter) =>
    [...chapter.querySelectorAll("[data-runner]")].map((runner, i) => {
      const path = chapter.querySelector(
        `[data-motion-path="${runner.dataset.lane}"]`,
      );
      return {
        runner,
        path,
        length: path.getTotalLength(),
        pace: Number(runner.dataset.pace),
        offset: Number(runner.dataset.offset),
        i,
      };
    }),
  );
  if (!section) return;
  let frame = 0,
    previous = -1;
  const clamp = (n) => Math.max(0, Math.min(1, n));
  function update() {
    frame = 0;
    const heroBounds = hero.getBoundingClientRect();
    const heroProgress = clamp(
      -heroBounds.top / Math.max(1, heroBounds.height - innerHeight),
    );
    hero.style.setProperty(
      "--hero-zoom",
      reduced.matches ? "1.05" : (1.2 - heroProgress * 0.14).toFixed(4),
    );
    hero.style.setProperty("--hero-copy-opacity", String(1 - clamp(-heroBounds.top / (innerHeight * .7))));
    hero.style.setProperty("--hero-copy-y", `${-Math.min(innerHeight * .2, -heroBounds.top * .15)}px`);
    if (cameraRoll) {
      const b = cameraRoll.getBoundingClientRect();
      const p = clamp((innerHeight - b.top) / (innerHeight + b.height));
      cameraRoll.style.setProperty(
        "--roll-title-x",
        reduced.matches
          ? "-120px"
          : `${-Math.min(innerWidth * 0.65, 900) + p * Math.min(innerWidth * 0.9, 1400)}px`,
      );
    }
    const box = section.getBoundingClientRect();
    const progress = reduced.matches
      ? 1
      : clamp((innerHeight * 0.84 - box.top) / (box.height * 0.76));
    section.style.setProperty("--route-progress", progress.toFixed(4));
    const count = Math.ceil(progress * words.length);
    if (count !== previous) {
      words.forEach((word, i) => word.classList.toggle("is-filled", i < count));
      previous = count;
    }
    if (lineup) {
      const bounds = lineup.getBoundingClientRect();
      const p = clamp(
        (innerHeight - bounds.top) / (innerHeight + bounds.height),
      );
      lineup.style.setProperty(
        "--race-title-x",
        reduced.matches
          ? "-80px"
          : `${120 - p * Math.min(innerWidth * 0.9, 1400)}px`,
      );
    }
    for (const [chapterIndex, chapter] of chapters.entries()) {
      const bounds = chapter.getBoundingClientRect();
      const p = reduced.matches
        ? 1
        : clamp(
            (innerHeight * 0.85 - bounds.top) /
              Math.min(innerHeight * 0.7, bounds.height * 0.9),
          );
      chapter.style.setProperty("--feeling-fill", `${(p * 100).toFixed(2)}%`);
      chapter.style.setProperty(
        "--feeling-copy-fill",
        `${((reduced.matches ? 1 : clamp((p - 0.12) / 0.88)) * 100).toFixed(2)}%`,
      );
      chapter.style.setProperty("--feeling-line", (1 - p).toFixed(4));
      for (const { runner, path, length, pace, offset, i } of movingRunners[
        chapterIndex
      ]) {
        const along = clamp(p * pace - offset + 0.03 * i);
        const point = path.getPointAtLength(along * length);
        runner.setAttribute(
          "transform",
          `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`,
        );
        const angle = reduced.matches ? 0 : Math.sin(p * 35 + i * 1.8) * 24;
        runner
          .querySelector("[data-run-front]")
          .setAttribute("transform", `rotate(${angle.toFixed(2)} 3 -1)`);
        runner
          .querySelector("[data-run-back]")
          .setAttribute("transform", `rotate(${(-angle).toFixed(2)} 2 -1)`);
        runner
          .querySelector("[data-run-arm]")
          .setAttribute(
            "transform",
            `rotate(${(-angle * 0.7).toFixed(2)} 0 -15)`,
          );
      }
      chapter
        .querySelectorAll("[data-gather]")
        .forEach((person) =>
          person.setAttribute(
            "transform",
            `translate(${(Number(person.dataset.gather) * (1.35 - p * 0.55)).toFixed(2)} 0)`,
          ),
        );
    }
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  reduced.addEventListener("change", schedule);
  const preview = document.querySelector("#run-preview-dialog");
  let previewTrigger;
  document.querySelectorAll("[data-preview-run]").forEach((button) =>
    button.addEventListener("click", () => {
      previewTrigger = button;
      preview.showModal();
    }),
  );
  document
    .querySelector("#close-run-preview")
    ?.addEventListener("click", () => preview.close());
  preview?.addEventListener("close", () => previewTrigger?.focus());
  document
    .querySelector("[data-point-next]")
    ?.addEventListener("click", (event) => {
      const next = document.getElementById(
        event.currentTarget.dataset.pointNext,
      );
      next?.scrollIntoView({
        behavior: reduced.matches ? "instant" : "smooth",
        block: "center",
      });
      const button = next?.querySelector("[data-preview-run]");
      button?.focus({ preventScroll: true });
    });
  update();
}
