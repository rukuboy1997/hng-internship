/**
 * Popup Script — AI Page Summarizer
 * Orchestrates UI state, messaging to content/background scripts,
 * and user interactions.
 */

"use strict";

// ─── DOM References ───────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const ui = {
  pageTitle:       $("pageTitle"),
  pageFavicon:     $("pageFavicon"),
  noKeyNotice:     $("noKeyNotice"),
  cachedNotice:    $("cachedNotice"),
  mainActions:     $("mainActions"),
  optionsBar:      $("optionsBar"),
  loadingState:    $("loadingState"),
  loadingText:     $("loadingText"),
  errorState:      $("errorState"),
  errorMessage:    $("errorMessage"),
  summarySection:  $("summarySection"),
  bulletList:      $("bulletList"),
  insightList:     $("insightList"),
  readingTime:     $("readingTime"),
  wordCount:       $("wordCount"),
  summarizeBtn:    $("summarizeBtn"),
  retryBtn:        $("retryBtn"),
  clearBtn:        $("clearBtn"),
  copyBtn:         $("copyBtn"),
  resummarizeBtn:  $("resummarizeBtn"),
  refreshBtn:      $("refreshBtn"),
  settingsBtn:     $("settingsBtn"),
  goToSettingsBtn: $("goToSettingsBtn"),
  themeBtn:        $("themeBtn"),
  bulletCount:     $("bulletCount"),
  sunIcon:         document.querySelector(".sun-icon"),
  moonIcon:        document.querySelector(".moon-icon"),
};

// ─── State ────────────────────────────────────────────────────────────────────

let currentTab = null;
let lastExtractedContent = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await initTheme();
  await loadCurrentTab();
  await checkApiKey();
  await checkCache();
  bindEvents();
});

// ─── Theme ────────────────────────────────────────────────────────────────────

async function initTheme() {
  const { theme } = await chrome.storage.sync.get("theme");
  applyTheme(theme || "light");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  ui.sunIcon.style.display  = theme === "dark"  ? "none"  : "";
  ui.moonIcon.style.display = theme === "dark"  ? ""      : "none";
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  await chrome.storage.sync.set({ theme: next });
}

// ─── Current Tab ──────────────────────────────────────────────────────────────

async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const title = currentTab?.title || "Unknown page";
  ui.pageTitle.textContent = title.length > 60 ? title.slice(0, 60) + "…" : title;

  // Favicon
  if (currentTab?.favIconUrl) {
    const img = document.createElement("img");
    img.src = currentTab.favIconUrl;
    img.alt = "";
    img.onerror = () => ui.pageFavicon.innerHTML = defaultFaviconSVG();
    ui.pageFavicon.appendChild(img);
  } else {
    ui.pageFavicon.innerHTML = defaultFaviconSVG();
  }
}

function defaultFaviconSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#94a3b8" stroke-width="2"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#94a3b8" stroke-width="2"/>
  </svg>`;
}

// ─── API Key Check ────────────────────────────────────────────────────────────

async function checkApiKey() {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) {
    ui.noKeyNotice.style.display = "flex";
    ui.summarizeBtn.disabled = true;
  }
}

// ─── Cache Check ─────────────────────────────────────────────────────────────

async function checkCache() {
  if (!currentTab?.url) return;

  const response = await chrome.runtime.sendMessage({
    type: "GET_CACHED_SUMMARY",
    url: currentTab.url,
  });

  if (response?.success && response.data) {
    renderSummary(response.data, true);
  }
}

// ─── Event Bindings ───────────────────────────────────────────────────────────

function bindEvents() {
  ui.summarizeBtn.addEventListener("click", () => runSummarize(false));
  ui.retryBtn.addEventListener("click", () => runSummarize(false));
  ui.refreshBtn?.addEventListener("click", () => runSummarize(true));
  ui.resummarizeBtn.addEventListener("click", () => runSummarize(true));
  ui.clearBtn.addEventListener("click", clearSummary);
  ui.copyBtn.addEventListener("click", copySummary);
  ui.themeBtn.addEventListener("click", toggleTheme);
  ui.settingsBtn.addEventListener("click", openSettings);
  ui.goToSettingsBtn?.addEventListener("click", openSettings);
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

// ─── Summarize Flow ───────────────────────────────────────────────────────────

async function runSummarize(forceRefresh = false) {
  if (!currentTab) return;

  // Clear cache if forcing refresh
  if (forceRefresh) {
    await chrome.runtime.sendMessage({
      type: "CLEAR_CACHE_FOR_URL",
      url: currentTab.url,
    });
  }

  showLoading("Extracting page content…");

  // Step 1: Extract content via content script
  let extracted;
  try {
    extracted = await extractContent();
    lastExtractedContent = extracted;
  } catch (err) {
    showError(err.message || "Could not read this page. Try reloading it first.");
    return;
  }

  setLoadingText("Sending to AI…");

  // Step 2: Request summary from background service worker
  const bulletCount = parseInt(ui.bulletCount.value, 10) || 5;

  let summaryResponse;
  try {
    summaryResponse = await chrome.runtime.sendMessage({
      type: "SUMMARIZE_PAGE",
      payload: {
        url: currentTab.url,
        title: extracted.title,
        bodyText: extracted.bodyText,
        wordCount: extracted.wordCount,
        readingTimeMinutes: extracted.readingTimeMinutes,
        bulletCount,
      },
    });
  } catch (err) {
    showError("Could not reach the background service. Please reload the extension.");
    return;
  }

  if (!summaryResponse?.success) {
    showError(summaryResponse?.error || "An unexpected error occurred.");
    return;
  }

  renderSummary(summaryResponse.data, summaryResponse.data.fromCache);
}

// ─── Content Extraction ───────────────────────────────────────────────────────

async function extractContent() {
  return new Promise((resolve, reject) => {
    if (!currentTab?.id) {
      reject(new Error("No active tab found."));
      return;
    }

    chrome.tabs.sendMessage(
      currentTab.id,
      { type: "EXTRACT_CONTENT" },
      (response) => {
        if (chrome.runtime.lastError) {
          // Content script may not be injected yet — try scripting API
          chrome.scripting.executeScript(
            {
              target: { tabId: currentTab.id },
              files: ["content.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                reject(new Error("Cannot access this page. Extensions are restricted on browser pages."));
                return;
              }
              // Retry after injection
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  currentTab.id,
                  { type: "EXTRACT_CONTENT" },
                  (retryResponse) => {
                    if (chrome.runtime.lastError || !retryResponse?.success) {
                      reject(new Error("Could not extract page content. The page may be restricted."));
                    } else {
                      resolve(retryResponse.data);
                    }
                  }
                );
              }, 100);
            }
          );
          return;
        }

        if (!response?.success) {
          reject(new Error(response?.error || "Content extraction failed."));
          return;
        }
        resolve(response.data);
      }
    );
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderSummary(data, fromCache) {
  const { bullets, insights, wordCount, readingTimeMinutes } = data;

  // Update meta
  ui.readingTime.textContent = `${readingTimeMinutes} min read`;
  ui.wordCount.textContent = `${wordCount?.toLocaleString() || "—"} words`;

  // Bullets
  ui.bulletList.innerHTML = "";
  (bullets || []).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = sanitizeForDisplay(text);
    ui.bulletList.appendChild(li);
  });

  // Insights
  ui.insightList.innerHTML = "";
  (insights || []).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = sanitizeForDisplay(text);
    ui.insightList.appendChild(li);
  });

  // Cached notice
  ui.cachedNotice.style.display = fromCache ? "flex" : "none";

  showView("summary");
}

// ─── State Transitions ────────────────────────────────────────────────────────

function showView(view) {
  ui.loadingState.style.display    = "none";
  ui.errorState.style.display      = "none";
  ui.summarySection.style.display  = "none";
  ui.mainActions.style.display     = "none";
  ui.optionsBar.style.display      = "none";

  if (view === "idle") {
    ui.mainActions.style.display = "block";
    ui.optionsBar.style.display  = "flex";
  } else if (view === "loading") {
    ui.loadingState.style.display = "flex";
  } else if (view === "error") {
    ui.errorState.style.display = "flex";
  } else if (view === "summary") {
    ui.summarySection.style.display = "flex";
  }
}

function showLoading(text) {
  ui.loadingText.textContent = text || "Processing…";
  showView("loading");
}

function setLoadingText(text) {
  ui.loadingText.textContent = text;
}

function showError(message) {
  ui.errorMessage.textContent = message;
  showView("error");
}

// ─── Clear ────────────────────────────────────────────────────────────────────

function clearSummary() {
  ui.bulletList.innerHTML = "";
  ui.insightList.innerHTML = "";
  ui.cachedNotice.style.display = "none";

  if (currentTab?.url) {
    chrome.runtime.sendMessage({
      type: "CLEAR_CACHE_FOR_URL",
      url: currentTab.url,
    });
  }

  showView("idle");
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

async function copySummary() {
  const bullets = Array.from(ui.bulletList.querySelectorAll("li"))
    .map((li) => `• ${li.textContent}`)
    .join("\n");

  const insights = Array.from(ui.insightList.querySelectorAll("li"))
    .map((li) => `→ ${li.textContent}`)
    .join("\n");

  const pageTitle = ui.pageTitle.textContent;
  const readingTime = ui.readingTime.textContent;

  const text = [
    `📄 ${pageTitle}`,
    `⏱ ${readingTime}`,
    "",
    "Summary",
    bullets,
    "",
    "Key Insights",
    insights,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  try {
    await navigator.clipboard.writeText(text);
    ui.copyBtn.classList.add("btn--copy-success");
    ui.copyBtn.textContent = "Copied!";
    setTimeout(() => {
      ui.copyBtn.classList.remove("btn--copy-success");
      ui.copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
        </svg>
        Copy`;
    }, 1800);
  } catch {
    // Clipboard may be blocked on some pages
    ui.copyBtn.textContent = "Failed";
    setTimeout(() => { ui.copyBtn.textContent = "Copy"; }, 1500);
  }
}

// ─── Security Helpers ─────────────────────────────────────────────────────────

/**
 * Sanitize AI-returned text before setting it as textContent.
 * textContent is inherently safe (no HTML parsing), but we still clean up
 * any stray control characters or abnormal whitespace.
 */
function sanitizeForDisplay(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // strip control chars
    .trim();
}

// ─── Initial View ─────────────────────────────────────────────────────────────

// Show idle by default (checkCache may override to summary)
showView("idle");
