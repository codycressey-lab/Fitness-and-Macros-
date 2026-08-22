/**
 * Hand-written lines. These run when the API is unreachable, slow, or
 * having a bad day — offline on a plane, dead wifi, a 500.
 *
 * The app must never show a blank space or an error where the
 * encouragement goes. These are picked by situation rather than at
 * random, so a degraded morning still reads like it was meant.
 *
 * They are deliberately written in the same voice as coach/persona.js.
 * If you change the voice there, change it here too.
 */

const LINES = {
  /** A streak is running. */
  streak: [
    "The chain's still going. Don't overthink it, just add a link.",
    "You've already proven you do this. Today's just paperwork.",
    "Streaks are boring right up until they're the whole personality. Keep going.",
    "You're not trying to start anymore. You're just continuing. Much easier job.",
  ],

  /** Yesterday went well. */
  momentum: [
    "Yesterday holds up. Do that again and the week takes care of itself.",
    "You closed yesterday properly. That's the hard part — today's downhill.",
    "Back-to-back is where this stops being an experiment. Go get it.",
  ],

  /** Yesterday was thin or missed. */
  reset: [
    "Yesterday's closed. The board's clean and the day's yours.",
    "One quiet day doesn't undo a month. Pick it back up.",
    "Nothing to fix, nothing to make up. Just start.",
    "The system's still standing. That's the whole point of it.",
  ],

  /** Early in the week. */
  weekOpen: [
    "Fresh week. Everything on the board is still available.",
    "Start it right and Thursday-you gets an easy life.",
    "Nobody's ahead of you yet. That's a nice place to be.",
  ],

  /** Late in the week. */
  weekClose: [
    "Most of this week's already banked. Land it.",
    "You're deep enough in that finishing costs less than stopping.",
    "Close the week out and it counts for the whole month.",
  ],

  /** Nothing else applies. */
  open: [
    "Nothing's happened yet today. That's the best part.",
    "The day's completely undefended. Go take it.",
    "You know exactly what today needs. Start with the easy one.",
    "First thing done makes the second thing obvious. Go.",
  ],
};

/**
 * Pick a line that fits the situation, and rotate deterministically by
 * date so the same day always shows the same line — a fallback that
 * reshuffles on every open reads as broken.
 */
export function pickFallback(ctx = {}) {
  const bucket = chooseBucket(ctx);
  const pool = LINES[bucket] || LINES.open;
  return pool[hashDate(ctx.date || "") % pool.length];
}

function chooseBucket(ctx) {
  const streaks = ctx.streaks || {};
  const best = Math.max(0, ...Object.values(streaks).filter((n) => typeof n === "number"));
  if (best >= 3) return "streak";

  const y = ctx.yesterday;
  if (y && typeof y.completion === "number") {
    if (y.completion >= 80) return "momentum";
    if (y.completion <= 25) return "reset";
  }

  const dow = ctx.dayOfWeek;
  if (dow === "Monday" || dow === "Tuesday") return "weekOpen";
  if (dow === "Thursday" || dow === "Friday") return "weekClose";

  return "open";
}

function hashDate(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Gratitude prompts for the same degraded case. */
const GRATITUDE = [
  "What's one thing in your house right now that you'd have been thrilled to own at 25?",
  "Who made your life easier this week without being asked?",
  "What did your body let you do today that you didn't have to think about?",
  "Name something that went right that you never even noticed going right.",
  "What's one problem you have today that you'd have killed to have five years ago?",
  "Who would be proud of the specific way you spent yesterday?",
];

export function pickGratitudeFallback(ctx = {}) {
  return GRATITUDE[hashDate(ctx.date || "") % GRATITUDE.length];
}
