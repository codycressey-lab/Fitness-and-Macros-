/**
 * The morning open — greeting, the coach's line, and the three
 * numbers that actually describe today.
 */

import { formatLongDate, phaseOf } from "../core/time.js";

/**
 * Rotates deterministically by date so it's a different line each day
 * but the same line all day. Name variants drop out when no name is
 * set, which is the default.
 */
export function pickGreeting(config, date = new Date()) {
  const phase = phaseOf(date);
  const name = (config.profile.name || "").trim();
  const pool = (config.greetings[phase] || config.greetings.morning).filter(
    (line) => name || !line.includes("{name}")
  );
  const idx = Math.floor(date.getTime() / 86400000) % pool.length;
  return pool[idx].replace("{name}", name);
}

/** Split the trailing term of address so it can carry the accent color. */
function splitGreeting(text) {
  const m = text.match(/^(.*?[,\s])([^,]+)$/);
  return m ? { head: m[1], tail: m[2] } : { head: text, tail: "" };
}

export function renderHero(mount, { config, date, stats }) {
  const greeting = pickGreeting(config, date);
  const { head, tail } = splitGreeting(greeting);

  mount.innerHTML = `
    <div class="hero-meta rise" style="--i:0">
      <span class="label" data-role="date"></span>
      <span class="dot"></span>
      <span class="label" data-role="week"></span>
    </div>

    <h1 class="greeting rise" style="--i:1">
      <span data-role="g-head"></span><span class="accent" data-role="g-tail"></span>
    </h1>

    <p class="encouragement is-loading rise" style="--i:2" data-role="line" aria-live="polite">
      <span class="shimmer"></span><span class="shimmer"></span>
    </p>
    <p class="encouragement-note" data-role="note" hidden></p>

    <div class="daystrip rise" style="--i:3" data-role="strip"></div>
  `;

  mount.querySelector('[data-role="date"]').textContent = formatLongDate(date);
  mount.querySelector('[data-role="week"]').textContent = stats.weekLabel;
  mount.querySelector('[data-role="g-head"]').textContent = head;
  mount.querySelector('[data-role="g-tail"]').textContent = tail;

  renderStrip(mount.querySelector('[data-role="strip"]'), stats);

  return {
    /** Swap the shimmer for the real line. */
    setLine(text, source) {
      const el = mount.querySelector('[data-role="line"]');
      el.classList.remove("is-loading");
      el.textContent = text;
      el.animate?.(
        [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" }
      );

      const note = mount.querySelector('[data-role="note"]');
      if (source === "written") {
        note.textContent = "Offline · written in advance";
        note.hidden = false;
      } else {
        note.hidden = true;
      }
    },
    refreshStats(next) {
      renderStrip(mount.querySelector('[data-role="strip"]'), next);
    },
  };
}

function renderStrip(el, stats) {
  el.innerHTML = stats.cells
    .map((c) => {
      const pips = Array.from({ length: c.total }, (_, i) =>
        `<i class="pip ${i < c.value ? "on" : ""}"></i>`
      ).join("");
      return `
      <div class="cell ${c.value > 0 ? "is-live" : ""}">
        <span class="v">${c.value}<span class="sub"> / ${c.total}</span></span>
        <span class="pips" aria-hidden="true">${pips}</span>
        <span class="k"></span>
      </div>`;
    })
    .join("");

  // Labels via textContent — never interpolate user config into HTML.
  el.querySelectorAll(".k").forEach((node, i) => {
    node.textContent = stats.cells[i].label;
  });
}
