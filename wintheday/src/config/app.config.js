/**
 * WIN THE DAY — default configuration.
 *
 * Everything a user sees or is measured against lives here: labels,
 * targets, greeting lines, day boundaries. Nothing personal is
 * hardcoded anywhere in src/. A user's saved settings are merged over
 * this at runtime (see src/core/store.js), so items can be renamed,
 * retargeted, reordered, or deleted without touching app code.
 *
 * Adding a second user later means keying stored state by user id —
 * no restructuring of this file.
 */

export const CONFIG_VERSION = 1;

export const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,

  profile: {
    /** Empty by default. The greeting works with or without it. */
    name: "",
    /** The waking window the Day Arc maps the sun across. */
    dayStart: "05:30",
    dayEnd: "22:00",
    /** When the app flips to Dusk regardless of the arc. */
    nightModeFrom: "20:00",
    /** 1 = Monday. Weekly targets reset on this day. */
    weekStartsOn: 1,
  },

  /**
   * Greeting lines, bucketed by phase so the app is never wrong about
   * what time it is. `{name}` variants are skipped when no name is set.
   */
  greetings: {
    morning: [
      "Good morning, killer.",
      "Let's go, champ.",
      "Morning, legend.",
      "Up and at it, hotshot.",
      "Good morning, machine.",
      "Rise and grind, boss.",
      "Morning, {name}.",
    ],
    afternoon: [
      "Afternoon, champ.",
      "Still going, legend.",
      "Back at it, killer.",
      "Afternoon, {name}.",
    ],
    evening: [
      "Evening, legend.",
      "Good evening, champ.",
      "Let's close it out, killer.",
      "Evening, {name}.",
    ],
  },

  tiers: [
    {
      id: "non-negotiables",
      label: "Non-negotiables",
      blurb: "Daily musts. Always first, always visible.",
      required: true,
      items: [
        { id: "teeth-am",   type: "daily",   label: "Brush teeth", note: "Morning" },
        { id: "teeth-pm",   type: "daily",   label: "Brush teeth", note: "Night" },
        { id: "floss",      type: "daily",   label: "Floss",       note: "Night" },
        {
          id: "workout",
          type: "weekly",
          label: "Workout",
          target: 6,
          unit: "workouts",
          restLabel: "Rest day",
        },
        {
          id: "perfect-food",
          type: "weekly-checklist",
          label: "Perfect food day",
          target: 5,
          unit: "perfect days",
          definition: "Hit protein · hit calories · no soda · no fast food · no sugar",
          criteria: [
            { id: "protein",   label: "Hit protein" },
            { id: "calories",  label: "Hit calories" },
            { id: "no-soda",   label: "No soda" },
            { id: "no-ff",     label: "No fast food" },
            { id: "no-sugar",  label: "No sugar" },
          ],
        },
        {
          id: "gratitude",
          type: "gratitude",
          label: "Start the day with gratitude",
          fields: 3,
          /** Done once at least this many entries are written. */
          minEntries: 1,
          /** Resurface an old entry roughly this often, from these ages. */
          resurfaceEveryDays: 6,
          resurfaceAges: [30, 90],
        },
      ],
    },
    {
      id: "house-money",
      label: "House money",
      blurb: "Everything here is played with the casino's chips. Pure upside — never required.",
      required: false,
      items: [
        {
          id: "girls-lesson",
          type: "weekly-intention",
          label: "This week's lesson for my girls",
          setOn: 1,      // Monday
          reviewOn: 0,   // Sunday
          pinned: true,
        },
        {
          id: "focus-hours",
          type: "hours",
          label: "Highly focused work",
          target: 2,
          unit: "hours",
          step: 0.5,
        },
        {
          id: "revenue-question",
          type: "question",
          label: "The Revenue Question",
          prompt: "What's the ONE thing you can do today to create revenue this week?",
          askAt: "morning",
          reviewAt: "night",
          reviewPrompt: "This morning you said you'd do this. Did you?",
        },
        {
          id: "spirit",
          type: "group",
          label: "Bible, pray, journal",
          items: [
            { id: "bible",   label: "Bible" },
            { id: "pray",    label: "Pray" },
            { id: "journal", label: "Journal" },
          ],
        },
        {
          id: "gym-ritual",
          type: "daily",
          label: "Gym ritual",
          note: "Sauna + podcast on the treadmill",
        },
        {
          id: "family-cozy",
          type: "daily",
          label: "Cozy with the family",
          note: "Pizza, movie, everybody on the couch",
          onlyOnDays: [5],   // Friday
          warm: true,        // rendered warmer than everything else
        },
      ],
    },
  ],

  journal: {
    prompts: [
      "Wins, struggles, breakthroughs — whatever's in your head.",
      "What actually happened today?",
      "Dump it. No structure required.",
    ],
  },

  /** Where the AI endpoint lives. Same-origin by default. */
  api: {
    base: "",
    path: "/api/coach",
    timeoutMs: 6500,
  },
};

/** Deep-merge saved settings over defaults, arrays replaced wholesale. */
export function mergeConfig(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && out[k] !== null) {
      out[k] = mergeConfig(out[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}
