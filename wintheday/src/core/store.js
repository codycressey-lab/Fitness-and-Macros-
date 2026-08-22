/**
 * Persistence. localStorage is the floor — everything is written
 * synchronously and read back on boot, so the app is fully usable
 * offline and never shows a spinner for its own data.
 *
 * Keys are namespaced and versioned so a schema change can migrate
 * rather than clobber. Journals are the thing we must never lose, so
 * they live in their own key and every write is verified.
 */

const NS = "wtd";
const SCHEMA = 1;

const K = {
  settings: `${NS}.v${SCHEMA}.settings`,
  days:     `${NS}.v${SCHEMA}.days`,
  journal:  `${NS}.v${SCHEMA}.journal`,
  cache:    `${NS}.v${SCHEMA}.aicache`,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn("[store] write failed", key, err);
    return false;
  }
}

/* ── Settings (the user's config patch) ─────────────────── */
export const getSettings = () => read(K.settings, {});
export const saveSettings = (patch) => write(K.settings, { ...getSettings(), ...patch });

/* Boot computes streaks, weekly targets and month-to-date, which reads the
   day store dozens of times. Parsing it on every read is the difference
   between opening instantly and not, so cache it and drop the cache on
   any write. */
let daysCache = null;

/* ── Day records ────────────────────────────────────────
   days[dayKey] = {
     items: { [itemId]: { done, at, value, criteria, entries } },
     skipped: [itemId],
   }
   `at` is an ISO timestamp — it's what puts a bead at the right
   hour on the Day Arc.
   ----------------------------------------------------- */
export function getDays() {
  if (daysCache === null) daysCache = read(K.days, {});
  return daysCache;
}

export function getDay(key) {
  return getDays()[key] || { items: {}, skipped: [] };
}

export function setItem(key, itemId, patch) {
  const days = getDays();
  const day = days[key] || { items: {}, skipped: [] };
  const prev = day.items[itemId] || {};
  const next = { ...prev, ...patch };

  // Stamp the completion time the first time it goes done.
  if (next.done && !prev.done) next.at = patch.at || new Date().toISOString();
  if (!next.done) delete next.at;

  day.items[itemId] = next;
  days[key] = day;
  daysCache = days;
  write(K.days, days);
  return next;
}

/* ── Journal — separate key, never overwritten wholesale ── */
export const getJournal = () => read(K.journal, {});

export function saveJournalEntry(key, entry) {
  const all = getJournal();
  all[key] = { ...(all[key] || {}), ...entry, updatedAt: new Date().toISOString() };
  const ok = write(K.journal, all);
  // Verify the round-trip. If the write silently failed, say so loudly.
  if (!ok || !getJournal()[key]) {
    console.error("[store] journal write did not persist");
    return false;
  }
  return true;
}

export function recentJournal(n = 3) {
  const all = getJournal();
  return Object.keys(all)
    .sort()
    .slice(-n)
    .map((k) => ({ date: k, ...all[k] }));
}

/* ── AI response cache — keyed by task + day ─────────────
   The morning line is generated once per day and then read from
   here, so opening the app ten times costs one request.
   ----------------------------------------------------- */
export function getCached(task, key) {
  const c = read(K.cache, {});
  return c[`${task}:${key}`];
}

export function setCached(task, key, value) {
  const c = read(K.cache, {});
  c[`${task}:${key}`] = value;
  // Keep the cache from growing forever — 60 entries is plenty.
  const keys = Object.keys(c);
  if (keys.length > 60) keys.sort().slice(0, keys.length - 60).forEach((k) => delete c[k]);
  write(K.cache, c);
}

/* ── Export: your data, in a file, whenever you want it ─── */
export function exportAll() {
  return {
    app: "win-the-day",
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    days: getDays(),
    journal: getJournal(),
  };
}

export function importAll(payload) {
  if (!payload || payload.app !== "win-the-day") throw new Error("Not a Win The Day export.");
  if (payload.settings) write(K.settings, payload.settings);
  if (payload.days) { write(K.days, payload.days); daysCache = null; }
  if (payload.journal) write(K.journal, payload.journal);
  return true;
}
