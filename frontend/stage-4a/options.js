/**
 * Options Page Script — AI Page Summarizer
 * Manages cache controls. API key and provider are no longer user-configurable
 * — the extension uses a secure proxy server with Gemini 2.5 Flash.
 */

"use strict";

const $ = (id) => document.getElementById(id);

const ui = {
  clearCacheBtn: $("clearCacheBtn"),
  cacheStatus:   $("cacheStatus"),
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
});

function bindEvents() {
  ui.clearCacheBtn.addEventListener("click", clearAllCache);
}

async function clearAllCache() {
  ui.clearCacheBtn.disabled = true;
  ui.clearCacheBtn.textContent = "Clearing…";

  try {
    const allData = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allData).filter((k) => k.startsWith("summary__"));

    if (cacheKeys.length === 0) {
      ui.cacheStatus.textContent = "No cached summaries to clear.";
    } else {
      await chrome.storage.local.remove(cacheKeys);
      ui.cacheStatus.textContent = `Cleared ${cacheKeys.length} cached summary${cacheKeys.length !== 1 ? "ies" : ""}.`;
    }

    setTimeout(() => {
      ui.cacheStatus.textContent = "";
    }, 3000);
  } catch {
    ui.cacheStatus.textContent = "Error clearing cache.";
  } finally {
    ui.clearCacheBtn.disabled = false;
    ui.clearCacheBtn.textContent = "Clear All Cached Summaries";
  }
}
