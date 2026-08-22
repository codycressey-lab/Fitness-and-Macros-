/**
 * Client side of the coach.
 *
 * Three guarantees, in priority order:
 *   1. Never show a blank space or an error. Ever.
 *   2. Never block the render. The greeting paints immediately; the
 *      line arrives when it arrives, and a hand-written one steps in
 *      if the network is slow enough to be annoying.
 *   3. Generate the morning line once per day, then read from cache.
 *
 * The API key is not here, and there is no code path that could put it
 * here. This module only ever talks to our own /api/coach endpoint.
 */

import { getCached, setCached } from "../core/store.js";
import { pickFallback, pickGratitudeFallback } from "./fallbacks.js";

async function callCoach(task, ctx, api) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), api.timeoutMs);

  try {
    const res = await fetch(`${api.base}${api.path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, ctx }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`coach ${res.status}`);
    const data = await res.json();
    if (!data || !data.ok) throw new Error(data?.error || "coach returned no content");
    return data.result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Today's line under the greeting.
 * Returns { text, source } where source is "cache" | "ai" | "written".
 */
export async function morningLine(ctx, api) {
  const cached = getCached("morning-line", ctx.date);
  if (cached) return { text: cached, source: "cache" };

  try {
    const text = String(await callCoach("morning-line", ctx, api)).trim();
    if (!text) throw new Error("empty line");
    setCached("morning-line", ctx.date, text);
    return { text, source: "ai" };
  } catch (err) {
    console.info("[coach] falling back to a written line —", err.message);
    return { text: pickFallback(ctx), source: "written" };
  }
}

/** Today's gratitude prompt. Same caching and fallback contract. */
export async function gratitudePrompt(ctx, api) {
  const cached = getCached("gratitude-prompt", ctx.date);
  if (cached) return { text: cached, source: "cache" };

  try {
    const text = String(await callCoach("gratitude-prompt", ctx, api)).trim();
    if (!text) throw new Error("empty prompt");
    setCached("gratitude-prompt", ctx.date, text);
    return { text, source: "ai" };
  } catch {
    return { text: pickGratitudeFallback(ctx), source: "written" };
  }
}

/**
 * The night-close response. Not cached by day — a second entry should
 * get a second response — and never silently swallowed, because the
 * journal screen needs to know whether it has a real reply to save.
 */
export async function journalResponse(ctx, api) {
  try {
    const result = await callCoach("journal-response", ctx, api);
    return { ...result, source: "ai" };
  } catch (err) {
    return {
      wins: "Writing it down at the end of a day is the part most people skip. You didn't.",
      reframe: "Tonight's response didn't come through, but the entry is saved and it isn't going anywhere.",
      scoreboard: "",
      tomorrow: "Tomorrow's board is clean.",
      source: "written",
      error: err.message,
    };
  }
}
