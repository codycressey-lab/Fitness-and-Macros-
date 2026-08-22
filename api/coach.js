/**
 * POST /api/coach  —  the only path between the app and Anthropic.
 *
 * The API key is read from process.env here, on the server, and is
 * never included in any response. The browser bundle has no code that
 * could obtain it.
 *
 * Body: { task: string, ctx: object }
 * Returns: { ok: true, result: string | object } | { ok: false, error }
 */

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, TASKS } from "../coach/persona.js";

const MODEL = process.env.COACH_MODEL || "claude-opus-5";

/** Hard ceiling on how much context a single request may carry. */
const MAX_CTX_CHARS = 24000;

/**
 * Blunt per-instance rate limit. The deployment URL is public and
 * there is no login, so this stops a stray crawler or a bored person
 * from spending real money. It resets on cold start by design — it is
 * a speed bump, not an auth system. See README for the stronger option.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  // Bound the map before inserting, or a stream of unique IPs grows it
  // without limit.
  if (hits.size > 5000) hits.clear();

  const rec = hits.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    hits.set(ip, { start: now, n: 1 });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_PER_WINDOW;
}

/** Pull plain text out of a response, skipping thinking blocks. */
function textOf(message) {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Tolerant JSON extraction for tasks that ask for an object. */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch { /* fall through */ }
    }
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Use POST." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // The app falls back to written lines on any non-200, so this is
    // a clean degrade rather than a broken screen.
    return res.status(503).json({ ok: false, error: "Coach is not configured." });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "Slow down a moment." });
  }

  const body = typeof req.body === "string" ? parseJson(req.body) : req.body;
  const task = body?.task;
  const spec = TASKS[task];
  if (!spec) {
    return res.status(400).json({ ok: false, error: "Unknown task." });
  }

  const ctx = body?.ctx && typeof body.ctx === "object" ? body.ctx : {};
  if (JSON.stringify(ctx).length > MAX_CTX_CHARS) {
    return res.status(413).json({ ok: false, error: "Too much context." });
  }

  const client = new Anthropic();

  const request = {
    model: MODEL,
    max_tokens: spec.maxTokens,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: { effort: spec.effort },
    messages: [{ role: "user", content: spec.build(ctx) }],
  };

  try {
    let message;
    try {
      // Server-side refusal fallback: if a safety classifier declines,
      // the same request is re-run on a fallback model inside this call.
      message = await client.beta.messages.create({
        ...request,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (err) {
      // If the fallback beta is unavailable, the coach still works.
      if (!(err instanceof Anthropic.BadRequestError)) throw err;
      console.warn("[coach] fallback beta rejected, retrying plain:", err.message);
      message = await client.messages.create(request);
    }

    if (message.stop_reason === "refusal") {
      return res.status(502).json({ ok: false, error: "Declined." });
    }

    const text = textOf(message);
    if (!text) return res.status(502).json({ ok: false, error: "Empty response." });

    // Tasks whose persona instructions ask for an object get parsed here.
    if (task === "journal-response") {
      const parsed = parseJson(text);
      if (!parsed) return res.status(502).json({ ok: false, error: "Unparseable response." });
      return res.status(200).json({ ok: true, result: parsed });
    }

    return res.status(200).json({ ok: true, result: text });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[coach] bad ANTHROPIC_API_KEY");
      return res.status(503).json({ ok: false, error: "Coach is not configured." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ ok: false, error: "Rate limited upstream." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[coach] api error ${err.status}:`, err.message);
      return res.status(502).json({ ok: false, error: "Upstream error." });
    }
    console.error("[coach] unexpected:", err);
    return res.status(500).json({ ok: false, error: "Unexpected error." });
  }
}
