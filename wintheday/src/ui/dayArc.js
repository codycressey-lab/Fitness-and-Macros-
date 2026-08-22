/**
 * THE DAY ARC
 *
 * One object that is both the clock and the progress bar.
 *
 *   - The sun's position on the curve is the real time of day, mapped
 *     across the configured waking window.
 *   - The curve behind it is lit; the curve ahead is a faint dotted
 *     track. That's the day you've spent versus the day you have left.
 *   - Each bead is something you actually finished, sitting at the
 *     hour you finished it.
 *   - The sun's heat — its glow, and the bloom it throws across the
 *     whole page background — is your completion, not the clock.
 *
 * The sky behind the entire app is driven from here too, because the
 * sky and the sun are one idea.
 */

import { clamp01 } from "../core/time.js";

const VB_W = 400;
const VB_H = 214;
const ARC_D = "M 18 186 C 92 40, 308 40, 382 186";

/**
 * Sky keyframes across the waking window. Each stop is
 * [top, middle, horizon] plus the sun's own three colors.
 * Values are interpolated, so the sky is never in a fixed "state" —
 * it's always mid-transition between two times of day.
 */
const SKY_STOPS = [
  { p: 0.00, sky: ["#F4F0FB", "#FFEDE2", "#FFE0CC"], ground: "#FFF9F4", sun: ["#FFF4E0", "#FFA842", "#F97F1B"] },
  { p: 0.10, sky: ["#FFF2E3", "#FFE9D1", "#FFDFBE"], ground: "#FFFAF3", sun: ["#FFF8EC", "#FFB43D", "#FF9A16"] },
  { p: 0.28, sky: ["#FFFAF3", "#FFF3E6", "#FFECD9"], ground: "#FFFCF8", sun: ["#FFFBF2", "#FFC65E", "#FFA92B"] },
  { p: 0.50, sky: ["#F7FBFF", "#F0F7FF", "#F8F4ED"], ground: "#FDFDFF", sun: ["#FFFDF8", "#FFD277", "#FFB43D"] },
  { p: 0.72, sky: ["#FEFCF7", "#FFF7EC", "#FFF0DF"], ground: "#FFFDFA", sun: ["#FFFBF1", "#FFC155", "#FFA424"] },
  { p: 0.90, sky: ["#FFF4E5", "#FFE7CC", "#FFD9B0"], ground: "#FFFAF1", sun: ["#FFF3DA", "#FFA633", "#F5820C"] },
  { p: 1.00, sky: ["#F7E9E1", "#E9D4D6", "#CCBBD8"], ground: "#FBF5F0", sun: ["#FFEBD2", "#F2913C", "#D9701C"] },
];

const NIGHT = {
  sky: ["#343573", "#242853", "#1B1F44"],
  ground: "#171B3A",
  sun: ["#CFCCF8", "#5A5EA8", "#3B3F7C"],
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => toHex(hex(a).map((v, i) => lerp(v, hex(b)[i], t)));

/**
 * The sky at a moment, warmed by how much of the day is done.
 *
 * Time picks the base palette; completion pulls it toward the sun's own
 * colour. At 0% it's a pale wash; at 100% the whole sky has gone golden.
 * This is the "brightness fills in as I complete items" behaviour — it
 * lives in the colour, not in an overlay.
 */
function skyAt(p, heat = 0) {
  const q = clamp01(p);
  const c = clamp01(heat);
  let lo = SKY_STOPS[0];
  let hi = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
    if (q >= SKY_STOPS[i].p && q <= SKY_STOPS[i + 1].p) {
      lo = SKY_STOPS[i];
      hi = SKY_STOPS[i + 1];
      break;
    }
  }
  const t = hi.p === lo.p ? 0 : (q - lo.p) / (hi.p - lo.p);
  const sun = lo.sun.map((v, i) => mix(v, hi.sun[i], t));
  const base = lo.sky.map((v, i) => mix(v, hi.sky[i], t));

  // Warming factors, strongest at the horizon where the sun actually is.
  const WARM = [0.03 + 0.09 * c, 0.05 + 0.15 * c, 0.07 + 0.21 * c];

  return {
    sky: base.map((v, i) => mix(v, sun[1], WARM[i])),
    ground: mix(mix(lo.ground, hi.ground, t), sun[1], 0.012 + 0.05 * c),
    sun,
  };
}

const SVG = `
<svg viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-labelledby="arcTitle" preserveAspectRatio="xMidYMid meet">
  <title id="arcTitle">The day so far</title>
  <defs>
    <linearGradient id="arcLitGrad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%"   stop-color="var(--sun-edge)" stop-opacity=".55"/>
      <stop offset="60%"  stop-color="var(--sun-mid)"  stop-opacity=".85"/>
      <stop offset="100%" stop-color="var(--sun-mid)"  stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="sunGlowGrad">
      <stop offset="0%"   stop-color="var(--sun-core)" stop-opacity=".85"/>
      <stop offset="22%"  stop-color="var(--sun-mid)"  stop-opacity=".42"/>
      <stop offset="55%"  stop-color="var(--sun-mid)"  stop-opacity=".13"/>
      <stop offset="100%" stop-color="var(--sun-mid)"  stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sunBodyGrad" cx="38%" cy="34%">
      <stop offset="0%"   stop-color="var(--sun-core)"/>
      <stop offset="55%"  stop-color="var(--sun-mid)"/>
      <stop offset="100%" stop-color="var(--sun-edge)"/>
    </radialGradient>
  </defs>

  <path class="arc-track" d="${ARC_D}"/>
  <path class="arc-lit"   d="${ARC_D}"/>
  <g class="beads"></g>
  <g class="sun-group">
    <circle class="sun-glow" r="52"/>
    <circle class="sun-body" r="10.5"/>
    <circle class="sun-rim"  r="10.5"/>
  </g>
</svg>
<div class="arc-now" hidden></div>
`;

export function createDayArc(mount) {
  mount.classList.add("arc");
  mount.innerHTML = SVG;

  const svg = mount.querySelector("svg");
  const track = svg.querySelector(".arc-track");
  const lit = svg.querySelector(".arc-lit");
  const beadsG = svg.querySelector(".beads");
  const sunG = svg.querySelector(".sun-group");
  const nowChip = mount.querySelector(".arc-now");

  const total = track.getTotalLength();
  lit.style.strokeDasharray = total;
  lit.style.strokeDashoffset = total;

  const pointAt = (p) => track.getPointAtLength(clamp01(p) * total);

  let drawn = false;

  /**
   * @param {object} s
   * @param {number} s.progress   0..1 through the waking window
   * @param {number} s.completion 0..1 of today's required dailies
   * @param {Array}  s.beads      [{ id, label, p }]
   * @param {string} s.mood       "morning" | "day" | "night"
   * @param {string} s.clock      formatted time for the chip
   */
  function update({ progress, completion, beads = [], mood, clock }) {
    const root = document.documentElement;
    const palette = mood === "night" ? NIGHT : skyAt(progress, completion);

    root.style.setProperty("--sky-1", palette.sky[0]);
    root.style.setProperty("--sky-2", palette.sky[1]);
    root.style.setProperty("--sky-3", palette.sky[2]);
    root.style.setProperty("--ground", palette.ground);
    root.style.setProperty("--sun-core", palette.sun[0]);
    root.style.setProperty("--sun-mid", palette.sun[1]);
    root.style.setProperty("--sun-edge", palette.sun[2]);
    root.style.setProperty("--sun-heat", String(clamp01(completion)));

    const sun = pointAt(progress);
    sunG.setAttribute("transform", `translate(${sun.x} ${sun.y})`);

    // Anchor the page-wide background bloom to the sun.
    root.style.setProperty("--sun-x", `${(sun.x / VB_W) * 100}%`);
    root.style.setProperty("--sun-y", `${(sun.y / VB_H) * 30}%`);

    // Draw the travelled arc on first paint, then track it.
    const offset = total * (1 - clamp01(progress));
    if (!drawn) {
      requestAnimationFrame(() => { lit.style.strokeDashoffset = offset; });
      drawn = true;
    } else {
      lit.style.strokeDashoffset = offset;
    }

    // Beads: one per finished thing, at the hour it happened.
    beadsG.innerHTML = beads
      .map((b) => {
        const pt = pointAt(Math.min(b.p, clamp01(progress)));
        const r = b.required ? 4 : 3.1;
        const safe = String(b.label).replace(/[<>&"]/g, "");
        return `<g class="bead-wrap">
          <circle class="bead-halo" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${r * 2.4}"/>
          <circle class="bead" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${r}"><title>${safe}</title></circle>
        </g>`;
      })
      .join("");

    // The time chip rides under the sun, nudged in at the edges so it
    // never hangs off the screen.
    if (clock) {
      const xPct = Math.min(84, Math.max(16, (sun.x / VB_W) * 100));
      nowChip.textContent = clock;
      nowChip.style.left = `${xPct}%`;
      nowChip.style.top = `${((sun.y + 22) / VB_H) * 100}%`;
      nowChip.hidden = false;
    }
  }

  return { update };
}
