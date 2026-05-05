"use strict";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_BODY_CHARS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1200;

function buildPrompt(title, bodyText, bulletCount) {
  const truncated = bodyText.slice(0, MAX_BODY_CHARS);
  return `You are a precise content summarizer. Always respond with valid JSON only. No markdown fences, no code blocks.

Summarize the following webpage for a user.

Page title: "${title}"

Page content:
"""
${truncated}
"""

Respond ONLY with a JSON object in exactly this shape (no extra text, no markdown):
{
  "bullets": ["string", "string", ...],
  "insights": ["string", "string", "string"]
}

Rules:
- bullets: exactly ${bulletCount} items, each a single short sentence (max 20 words), plain text
- insights: exactly 3 items, each a pithy non-obvious observation or takeaway
- No markdown inside strings (no **, no #, no -)
- No extra keys in the JSON
- If content is insufficient, do your best with what is available`;
}

function parseAIResponse(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI returned an unexpected response format.");
    parsed = JSON.parse(match[0]);
  }

  const bullets = Array.isArray(parsed.bullets)
    ? parsed.bullets.filter((b) => typeof b === "string" && b.trim())
    : [];
  const insights = Array.isArray(parsed.insights)
    ? parsed.insights.filter((i) => typeof i === "string" && i.trim())
    : [];

  if (bullets.length === 0) {
    throw new Error("AI could not generate a summary for this page.");
  }

  return { bullets, insights };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(prompt) {
  // Use v1 (not v1beta) — required for gemini-2.5-flash
  // systemInstruction is NOT included — it is not supported on v1; instruction is embedded in the prompt instead
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let geminiRes;
    try {
      geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      });
    } catch {
      if (attempt === MAX_RETRIES) {
        throw new Error("Failed to reach Gemini API. Check your internet connection.");
      }
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      continue;
    }

    // Retry on 503 (model overloaded) or 429 (rate limit)
    if ((geminiRes.status === 503 || geminiRes.status === 429) && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      continue;
    }

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      const msg = errBody?.error?.message || `Gemini error ${geminiRes.status}`;
      if (geminiRes.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
      if (geminiRes.status === 503) throw new Error("Gemini is temporarily overloaded. Please try again in a few seconds.");
      if (geminiRes.status === 401 || geminiRes.status === 403) throw new Error("Gemini API key is invalid or unauthorized.");
      throw new Error(msg);
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text;
  }

  throw new Error("Gemini did not respond after retries. Please try again.");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server not configured. GEMINI_API_KEY environment variable is missing." });
  }

  const { title, bodyText, bulletCount } = req.body || {};

  if (!bodyText || typeof bodyText !== "string") {
    return res.status(400).json({ error: "Missing or invalid bodyText." });
  }

  const count = parseInt(bulletCount, 10) || 5;
  const prompt = buildPrompt(title || "Untitled", bodyText, count);

  let rawText;
  try {
    rawText = await callGemini(prompt);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  let summary;
  try {
    summary = parseAIResponse(rawText);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json(summary);
}
