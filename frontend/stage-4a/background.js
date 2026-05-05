/**
 * Background Service Worker — AI Page Summarizer
 *
 * Responsibilities:
 *  - Receive SUMMARIZE_PAGE requests from popup
 *  - Forward to the secure proxy server (API key is never in the extension)
 *  - Cache summaries per URL in chrome.storage.local
 *  - Return structured summary (bullets + insights + meta) to popup
 *  - Handle errors and rate limiting gracefully
 */

"use strict";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * URL of the deployed Vercel proxy server.
 * After deploying proxy-server/ to Vercel, paste your deployment URL here:
 * e.g.  https://ai-summarizer-proxy.vercel.app/api/summarize
 */
const PROXY_URL = "https://ai-page-summarizer-proxy.vercel.app/api/summarize";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 1;

// ─── Message Router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SUMMARIZE_PAGE") {
    handleSummarize(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
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

  // 2. Call proxy with retry
  const summary = await callProxyWithRetry(title, bodyText, bulletCount, MAX_RETRIES);

  // 3. Attach meta
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

  // 4. Store in cache
  await setCachedSummary(url, result);

  return result;
}

// ─── Proxy Call ───────────────────────────────────────────────────────────────

async function callProxyWithRetry(title, bodyText, bulletCount, retries) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callProxy(title, bodyText, bulletCount);
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(800 * (attempt + 1));
    }
  }
}

async function callProxy(title, bodyText, bulletCount) {
  let response;
  try {
    response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, bodyText, bulletCount }),
    });
  } catch {
    throw new Error("Could not reach the summarizer service. Check your internet connection.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error || `Server error ${response.status}`;
    if (response.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
    if (response.status === 500) throw new Error("Summarizer service error. Please try again shortly.");
    throw new Error(msg);
  }

  const bullets = Array.isArray(data.bullets) ? data.bullets.filter((b) => typeof b === "string" && b.trim()) : [];
  const insights = Array.isArray(data.insights) ? data.insights.filter((i) => typeof i === "string" && i.trim()) : [];

  if (bullets.length === 0) {
    throw new Error("AI could not generate a summary for this page. The content may be too short or inaccessible.");
  }

  return { bullets, insights };
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────

function cacheKey(url) {
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

// ─── Utility ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
