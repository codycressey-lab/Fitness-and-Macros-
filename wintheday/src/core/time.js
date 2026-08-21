/** Date + day-shape helpers. All local-time; no UTC drift on day keys. */

export const DAY_MS = 86400000;

/** "YYYY-MM-DD" in local time — the key every day's data hangs off. */
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromDayKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** "05:30" → minutes since midnight. */
export function parseHM(hm) {
  const [h, m] = String(hm).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesOfDay(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Where we are through the waking window, 0..1.
 * Before dayStart clamps to 0, after dayEnd clamps to 1 — the sun
 * waits at the horizon rather than falling off the canvas.
 */
export function dayProgress(now, dayStart, dayEnd) {
  const t = minutesOfDay(now);
  const a = parseHM(dayStart);
  const b = parseHM(dayEnd);
  if (b <= a) return 0;
  return clamp01((t - a) / (b - a));
}

/** Coarse phase, used to pick a greeting bucket. */
export function phaseOf(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/** Which of the three moods the whole app should wear. */
export function moodOf(now, profile) {
  const t = minutesOfDay(now);
  if (t >= parseHM(profile.nightModeFrom) || t < parseHM(profile.dayStart)) return "night";
  const p = dayProgress(now, profile.dayStart, profile.dayEnd);
  return p < 0.30 ? "morning" : "day";
}

/** Monday-based (or configured) start of the week containing `d`. */
export function startOfWeek(d, weekStartsOn = 1) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const shift = (out.getDay() - weekStartsOn + 7) % 7;
  out.setDate(out.getDate() - shift);
  return out;
}

/** The seven day-keys of the week containing `d`. */
export function weekKeys(d, weekStartsOn = 1) {
  const start = startOfWeek(d, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(start, i)));
}

/** The last `n` day-keys ending today, oldest first. */
export function lastNDays(n, d = new Date()) {
  return Array.from({ length: n }, (_, i) => dayKey(addDays(d, i - n + 1)));
}

export function formatLongDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function formatClock(d = new Date()) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
