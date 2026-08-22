/**
 * Boot. Wires config → state → the morning screen.
 */

import { DEFAULT_CONFIG, mergeConfig } from "./config/app.config.js";
import { getSettings, getDay, recentJournal } from "./core/store.js";
import {
  dayKey, dayProgress, moodOf, formatClock, weekKeys, lastNDays, addDays, phaseOf,
} from "./core/time.js";
import {
  todayCompletion, beadsForDate, weeklyProgress, streak, completionHistory,
  itemsForDate, isDone,
} from "./core/day.js";
import { createDayArc } from "./ui/dayArc.js";
import { renderHero } from "./ui/greeting.js";
import { morningLine } from "./ai/coach.js";

const config = mergeConfig(DEFAULT_CONFIG, getSettings());
const { profile } = config;

/** Every weekly-target item, wherever it lives in the config. */
function weeklyItems() {
  return config.tiers
    .flatMap((t) => t.items)
    .filter((i) => i.type === "weekly" || i.type === "weekly-checklist");
}

function requiredDailyCounts(date) {
  const day = getDay(dayKey(date));
  let done = 0;
  let total = 0;
  for (const tier of config.tiers) {
    if (!tier.required) continue;
    for (const item of itemsForDate(tier, date)) {
      if (!["daily", "gratitude", "group"].includes(item.type)) continue;
      total += 1;
      if (isDone(item, day.items[item.id])) done += 1;
    }
  }
  return { done, total };
}

function buildStats(date) {
  const { done, total } = requiredDailyCounts(date);
  const cells = [{ value: done, total, label: "Today" }];

  for (const item of weeklyItems().slice(0, 2)) {
    const wp = weeklyProgress(item, date, profile.weekStartsOn);
    cells.push({ value: wp.count, total: wp.target, label: item.label });
  }

  const keys = weekKeys(date, profile.weekStartsOn);
  const idx = keys.indexOf(dayKey(date)) + 1;
  return { cells, weekLabel: `Day ${idx} of 7` };
}

/**
 * Everything the coach model is allowed to know. Assembled here so
 * there is exactly one place to look when tuning what it sees.
 */
function buildContext(date) {
  const yKey = dayKey(addDays(date, -1));
  const yDay = getDay(yKey);

  const yesterdayDone = config.tiers
    .flatMap((t) => itemsForDate(t, addDays(date, -1)))
    .filter((i) => isDone(i, yDay.items[i.id]))
    .map((i) => i.label);

  const streaks = {};
  for (const tier of config.tiers) {
    for (const item of tier.items) {
      const n = streak(item.id, item, date);
      if (n > 0) streaks[item.label] = n;
    }
  }

  const weekly = weeklyItems().map((item) => {
    const wp = weeklyProgress(item, date, profile.weekStartsOn);
    return { label: item.label, done: wp.count, target: wp.target, met: wp.met };
  });

  const mtd = lastNDays(date.getDate(), date).map((k) => k);

  return {
    date: dayKey(date),
    dayOfWeek: date.toLocaleDateString("en-US", { weekday: "long" }),
    yesterday: {
      date: yKey,
      completion: Math.round(todayCompletion(config, addDays(date, -1)) * 100),
      completed: yesterdayDone,
    },
    streaks,
    weeklyTargets: weekly,
    last7Days: completionHistory(config, 7, date),
    monthToDate: {
      daysElapsed: mtd.length,
      averageCompletion: Math.round(
        completionHistory(config, mtd.length, date).reduce((a, d) => a + d.completion, 0) /
          Math.max(1, mtd.length)
      ),
    },
    recentJournals: recentJournal(3).map((j) => ({ date: j.date, entry: j.entry })),
  };
}

/* ── Boot ────────────────────────────────────────────────── */

const arc = createDayArc(document.getElementById("arc"));
const now = () => new Date();

function paint(date) {
  const mood = moodOf(date, profile);
  document.documentElement.dataset.mood = mood;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", mood === "night" ? "#171B3A" : "#FFE3C4");

  arc.update({
    progress: dayProgress(date, profile.dayStart, profile.dayEnd),
    completion: todayCompletion(config, date),
    beads: beadsForDate(config, date, profile),
    mood,
    clock: formatClock(date),
  });
}

let date = now();
let hero = null;

/**
 * Mount (or re-mount) the hero. The coach line is cached per day, so a
 * re-render after a phase change costs nothing and never refetches.
 */
function mountHero(d) {
  hero = renderHero(document.getElementById("hero"), {
    config,
    date: d,
    stats: buildStats(d),
  });

  // The screen is already complete and readable at this point. The line
  // arrives when it arrives.
  morningLine(buildContext(d), config.api).then(({ text, source }) => {
    hero.setLine(text, source);
  });
}

paint(date);
mountHero(date);

// Keep the sun honest without redrawing the world. The greeting only
// re-renders when the phase or the date actually changes, so an app left
// open through lunch stops saying "Good morning" — and one left open
// overnight rolls onto the new day by itself.
let lastPhase = phaseOf(date);
let lastDay = dayKey(date);

function tick() {
  const d = now();
  paint(d);

  const phase = phaseOf(d);
  const key = dayKey(d);
  if (phase !== lastPhase || key !== lastDay) {
    lastPhase = phase;
    lastDay = key;
    date = d;
    mountHero(d);
  }
}

setInterval(tick, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
