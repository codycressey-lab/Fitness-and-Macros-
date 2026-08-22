/**
 * Turns config + stored records into the shape the UI renders.
 *
 * The important rule lives here: weekly-target items are never
 * "incomplete today". A rest day is not a miss. Only genuinely daily
 * items count toward today's completion, so the sun never dims because
 * you didn't lift on a Tuesday.
 */

import { dayKey, weekKeys, dayProgress, clamp01, parseHM, minutesOfDay } from "./time.js";
import { getDay, getDays } from "./store.js";

/** Items from a tier that actually apply on this date. */
export function itemsForDate(tier, date) {
  const dow = date.getDay();
  return tier.items.filter((it) => !it.onlyOnDays || it.onlyOnDays.includes(dow));
}

const DAILY_TYPES = new Set(["daily", "gratitude", "group"]);

/** Is this item done, given its record? Type-aware. */
export function isDone(item, rec = {}) {
  if (!rec) return false;
  switch (item.type) {
    case "gratitude": {
      const written = (rec.entries || []).filter((e) => e && e.trim()).length;
      return written >= (item.minEntries ?? 1);
    }
    case "group": {
      const sub = rec.sub || {};
      return item.items.length > 0 && item.items.every((s) => sub[s.id]);
    }
    case "hours":
      return (rec.value || 0) >= (item.target || 0);
    case "question":
      return Boolean(rec.value && String(rec.value).trim());
    default:
      return Boolean(rec.done);
  }
}

/**
 * Today's completion, 0..1 — the number that drives the sun's heat.
 * Counts only required daily items. Weekly targets and House Money
 * are upside; they can push it up, never drag it down.
 */
export function todayCompletion(config, date = new Date()) {
  const key = dayKey(date);
  const day = getDay(key);
  let done = 0;
  let total = 0;

  for (const tier of config.tiers) {
    if (!tier.required) continue;
    for (const item of itemsForDate(tier, date)) {
      if (!DAILY_TYPES.has(item.type)) continue;
      total += 1;
      if (isDone(item, day.items[item.id])) done += 1;
    }
  }
  return total === 0 ? 0 : done / total;
}

/**
 * Beads for the Day Arc: every completed thing today, positioned at
 * the hour it actually happened.
 */
export function beadsForDate(config, date, profile) {
  const key = dayKey(date);
  const day = getDay(key);
  const beads = [];

  for (const tier of config.tiers) {
    for (const item of itemsForDate(tier, date)) {
      const rec = day.items[item.id];
      if (!rec || !isDone(item, rec)) continue;
      const at = rec.at ? new Date(rec.at) : null;
      const p = at
        ? clamp01(
            (minutesOfDay(at) - parseHM(profile.dayStart)) /
              Math.max(1, parseHM(profile.dayEnd) - parseHM(profile.dayStart))
          )
        : null;
      beads.push({ id: item.id, label: item.label, p, required: tier.required });
    }
  }
  // Anything without a timestamp (imported/legacy) trails at the start.
  return beads.map((b, i) => (b.p === null ? { ...b, p: 0.02 + i * 0.015 } : b));
}

/** Progress on a weekly-target item across the current week. */
export function weeklyProgress(item, date, weekStartsOn = 1) {
  const keys = weekKeys(date, weekStartsOn);
  const days = getDays();
  let count = 0;
  const perDay = keys.map((k) => {
    const rec = days[k]?.items?.[item.id];
    const done = rec ? isDone(item, rec) : false;
    const skipped = Boolean(days[k]?.skipped?.includes(item.id));
    if (done) count += 1;
    return { key: k, done, skipped };
  });
  return { count, target: item.target || 0, perDay, met: count >= (item.target || 0) };
}

/**
 * Streak with Way of Life semantics: a skipped day is neutral — it
 * neither extends nor breaks the chain. Only an unmarked, un-skipped
 * past day ends it.
 */
export function streak(itemId, item, date = new Date()) {
  const days = getDays();
  let n = 0;
  const cursor = new Date(date);
  for (let i = 0; i < 400; i += 1) {
    const k = dayKey(cursor);
    const rec = days[k]?.items?.[itemId];
    const done = rec ? isDone(item, rec) : false;
    const skipped = Boolean(days[k]?.skipped?.includes(itemId));

    if (done) n += 1;
    else if (skipped) { /* chain survives, streak doesn't grow */ }
    else if (i === 0) { /* today isn't a miss until the day is over */ }
    else break;

    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

/** Compact history the coach model gets fed. */
export function completionHistory(config, days = 7, date = new Date()) {
  const out = [];
  const cursor = new Date(date);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    out.push({ date: dayKey(d), completion: Math.round(todayCompletion(config, d) * 100) });
  }
  return out;
}

export { dayProgress };
