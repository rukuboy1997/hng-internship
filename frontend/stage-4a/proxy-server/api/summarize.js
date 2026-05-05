"use strict";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_BODY_CHARS = 8000;

function buildPrompt(title, bodyText, bulletCount) {
  const truncated = bodyText.slice(0, MAX_BODY_CHARS);
  return `You are summarizing a webpage for a user.

Page title: "${title}"

Page content:
"""
${truncated}
"""

Respond ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "bullets": ["string", "string", ...],
  "insights": ["string", "string", "string"]
}

Rules:
- bullets: ${bulletCount} items, each a single short sentence (max 20 words), in plain text
- insights: exactly 3 items, each a pithy, non-obvious observation or takeaway
- No markdown inside the strings (no **, no #, no -)
- No extra keys in the JSON
- If content is insufficient, do your best with what's available`;
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
    return res.status(500).json({ error: "Server not configured. GEMINI_API_KEY is missing." });
  }

  const { title, bodyText, bulletCount } = req.body || {};

  if (!bodyText || typeof bodyText !== "string") {
    return res.status(400).json({ error: "Missing or invalid bodyText." });
  }

  const count = parseInt(bulletCount, 10) || 5;
  const prompt = buildPrompt(title || "Untitled", bodyText, count);

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  let geminiRes;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
        },
        systemInstruction: {
          parts: [
            {
              text: "You are a precise content summarizer. Always respond with valid JSON only. No markdown fences.",
            },
          ],
        },
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach Gemini API." });
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.json().catch(() => ({}));
    const msg = errBody?.error?.message || `Gemini error ${geminiRes.status}`;
    if (geminiRes.status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Please wait a moment." });
    }
    return res.status(geminiRes.status).json({ error: msg });
  }

  const data = await geminiRes.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  let summary;
  try {
    summary = parseAIResponse(text);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json(summary);
}
