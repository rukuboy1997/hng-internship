/**
 * Background Service Worker — AI Page Summarizer
 *
 * Responsibilities:
 *  - Receive SUMMARIZE_PAGE requests from popup
 *  - Retrieve user settings (API key, provider) from chrome.storage
 *  - Call the AI provider API securely (key never leaves this worker)
 *  - Cache summaries per URL in chrome.storage.local
 *  - Return structured summary (bullets + insights + meta) to popup
 *  - Handle errors and rate limiting gracefully
 */

"use strict";

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 1;

// ─── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SUMMARIZE_PAGE") {
    handleSummarize(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === "CLEAR_CACHE_FOR_URL") {
    clearCacheForUrl(message.url)
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  if (message.type === "GET_CACHED_SUMMARY") {
    getCachedSummary(message.url)
      .then((cached) => sendResponse({ success: true, data: cached }))
      .catch(() => sendResponse({ success: false, data: null }));
    return true;
  }
});

// ─── Core Handler ─────────────────────────────────────────────────────────────

async function handleSummarize(payload) {
  const { url, title, bodyText, wordCount, readingTimeMinutes, bulletCount } = payload;

  // 1. Check cache first
  const cached = await getCachedSummary(url);
  if (cached && cached.bulletCount === bulletCount) {
    return { ...cached, fromCache: true };
  }

  // 2. Load settings
  const settings = await getSettings();
  if (!settings.apiKey) {
    throw new Error("No API key configured. Open the extension settings to add your API key.");
  }

  // 3. Call AI provider
  const summary = await callAIWithRetry(settings, title, bodyText, bulletCount, MAX_RETRIES);

  // 4. Attach meta
  const result = {
    ...summary,
    wordCount,
    readingTimeMinutes,
    bulletCount,
    url,
    title,
    cachedAt: Date.now(),
    fromCache: false,
  };

  // 5. Store in cache
  await setCachedSummary(url, result);

  return result;
}

// ─── AI Provider Dispatch ─────────────────────────────────────────────────────

async function callAIWithRetry(settings, title, bodyText, bulletCount, retries) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callAI(settings, title, bodyText, bulletCount);
    } catch (err) {
      if (attempt === retries) throw err;
      // Back-off briefly before retry
      await sleep(800 * (attempt + 1));
    }
  }
}

async function callAI(settings, title, bodyText, bulletCount) {
  const { provider, apiKey, model } = settings;

  if (provider === "openai") {
    return callOpenAI(apiKey, model || "gpt-4o-mini", title, bodyText, bulletCount);
  } else if (provider === "gemini") {
    return callGemini(apiKey, model || "gemini-1.5-flash", title, bodyText, bulletCount);
  } else {
    throw new Error(`Unknown provider: "${provider}". Please check your settings.`);
  }
}

// ─── OpenAI Integration ───────────────────────────────────────────────────────

async function callOpenAI(apiKey, model, title, bodyText, bulletCount) {
  const prompt = buildPrompt(title, bodyText, bulletCount);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a precise content summarizer. Always respond with valid JSON only. No markdown fences.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const msg = errorBody?.error?.message || `OpenAI error ${response.status}`;
    if (response.status === 401) throw new Error("Invalid OpenAI API key. Check your settings.");
    if (response.status === 429) throw new Error("OpenAI rate limit reached. Please wait a moment.");
    if (response.status === 402) throw new Error("OpenAI quota exceeded. Check your billing.");
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAIResponse(text);
}

// ─── Gemini Integration ───────────────────────────────────────────────────────

async function callGemini(apiKey, model, title, bodyText, bulletCount) {
  const prompt = buildPrompt(title, bodyText, bulletCount);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
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

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const msg =
      errorBody?.error?.message || `Gemini error ${response.status}`;
    if (response.status === 400 && msg.includes("API_KEY")) {
      throw new Error("Invalid Gemini API key. Check your settings.");
    }
    if (response.status === 429) throw new Error("Gemini rate limit reached. Please wait a moment.");
    throw new Error(msg);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseAIResponse(text);
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(title, bodyText, bulletCount) {
  const truncated = bodyText.slice(0, 8000);
  return `You are summarizing a webpage for a user.

Page title: "${title}"

Page content:
"""
${truncated}
"""

Respond ONLY with a JSON object (no markdown, no code fences) in exactly this shape:
{
  "bullets": ["string", "string", ...],  // exactly ${bulletCount} concise bullet points summarizing the page
  "insights": ["string", "string", "string"]  // exactly 3 key insights or takeaways
}

Rules:
- bullets: ${bulletCount} items, each a single short sentence (max 20 words), in plain text
- insights: exactly 3 items, each a pithy, non-obvious observation or takeaway
- No markdown inside the strings (no **, no #, no -)
- No extra keys in the JSON
- If content is insufficient, do your best with what's available`;
}

// ─── Response Parser ──────────────────────────────────────────────────────────

function parseAIResponse(text) {
  // Strip any accidental markdown fences
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI returned an unexpected response format. Please try again.");
    parsed = JSON.parse(match[0]);
  }

  const bullets = Array.isArray(parsed.bullets)
    ? parsed.bullets.filter((b) => typeof b === "string" && b.trim())
    : [];
  const insights = Array.isArray(parsed.insights)
    ? parsed.insights.filter((i) => typeof i === "string" && i.trim())
    : [];

  if (bullets.length === 0) {
    throw new Error("AI could not generate a summary for this page. The content may be too short or inaccessible.");
  }

  return { bullets, insights };
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

function cacheKey(url) {
  // Normalize URL (strip fragment)
  try {
    const u = new URL(url);
    u.hash = "";
    return `summary__${u.toString()}`;
  } catch {
    return `summary__${url}`;
  }
}

async function getCachedSummary(url) {
  const key = cacheKey(url);
  const result = await chrome.storage.local.get(key);
  const entry = result[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    // Expired — delete silently
    await chrome.storage.local.remove(key);
    return null;
  }
  return entry;
}

async function setCachedSummary(url, data) {
  const key = cacheKey(url);
  await chrome.storage.local.set({ [key]: data });
}

async function clearCacheForUrl(url) {
  const key = cacheKey(url);
  await chrome.storage.local.remove(key);
}

// ─── Settings Helpers ─────────────────────────────────────────────────────────

async function getSettings() {
  const result = await chrome.storage.sync.get([
    "apiKey",
    "provider",
    "model",
  ]);
  return {
    apiKey: result.apiKey || "",
    provider: result.provider || "openai",
    model: result.model || "",
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
