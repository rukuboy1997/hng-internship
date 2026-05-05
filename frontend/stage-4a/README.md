# AI Page Summarizer — Chrome Extension

A **Manifest V3** Chrome extension that extracts the content of any webpage and generates a structured AI-powered summary: bullet points, key insights, and estimated reading time — in seconds.

---

## Features

- **Smart content extraction** — heuristic-based readability parser avoids navbars, sidebars, and footers
- **Structured AI output** — bullet summary + key insights, configurable bullet count (3–10)
- **Two AI providers** — OpenAI (GPT-4o mini/GPT-4o) or Google Gemini (1.5 Flash/Pro)
- **Secure API key storage** — keys stored in Chrome's encrypted `chrome.storage.sync`, never hardcoded
- **Per-URL caching** — summaries cached for 30 minutes to avoid redundant API calls
- **Dark/light mode** — persisted theme toggle
- **Copy to clipboard** — one-click copy of the full summary
- **Graceful errors** — clear messages for rate limits, auth failures, and restricted pages

---

## Installation (Local / Unpacked)

> This extension is **not** published to the Chrome Web Store. Install it locally as an unpacked extension.

### Step 1 — Download

Clone or download this repository:

```bash
git clone <your-repo-url>
```

Or download the ZIP from GitHub and extract it.

### Step 2 — Open Chrome Extensions

1. Open Google Chrome
2. Navigate to `chrome://extensions` in the address bar
3. Enable **Developer mode** (toggle in the top-right corner)

### Step 3 — Load the Extension

1. Click **"Load unpacked"**
2. Select the `chrome-extension` folder (the one containing `manifest.json`)
3. The extension will appear in your extensions list

### Step 4 — Pin the Extension (Optional)

1. Click the puzzle piece icon (🧩) in the Chrome toolbar
2. Find **"AI Page Summarizer"** and click the pin icon to keep it visible

### Step 5 — Configure Your API Key

1. Click the extension icon in the toolbar
2. Click the **⚙ Settings** icon (top-right of the popup)
3. Select your AI provider (OpenAI or Gemini)
4. Paste your API key
5. Click **Save Settings**

---

## Getting an API Key

### OpenAI
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-…`)

> Note: OpenAI requires a paid account with billing enabled. `gpt-4o-mini` is the most cost-effective model.

### Google Gemini
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with a Google account
3. Click **"Create API key"**
4. Copy the key (starts with `AIza…`)

> Note: Gemini has a free tier. `gemini-1.5-flash` is fast and free within limits.

---

## Usage

1. Navigate to any article, blog post, or webpage
2. Click the extension icon in the toolbar
3. (Optional) Adjust the number of bullet points in the dropdown
4. Click **"Summarize Page"**
5. The extension will:
   - Extract readable content from the page
   - Send it to the configured AI provider
   - Display a bullet summary, key insights, reading time, and word count
6. Use **Copy** to copy the summary to your clipboard
7. Use **Re-summarize** to generate a fresh summary (bypasses cache)

---

## Architecture

```
chrome-extension/
├── manifest.json         # Manifest V3 config — permissions, scripts, icons
├── popup.html            # Extension popup UI (380×max-580px)
├── popup.css             # Popup styles — dark/light mode, responsive layout
├── popup.js              # Popup logic — state machine, messaging, rendering
├── background.js         # Service worker — AI API calls, caching, error handling
├── content.js            # Content script — page content extraction heuristics
├── options.html          # Settings page — provider, model, API key
├── options.css           # Settings page styles
├── options.js            # Settings page logic — storage read/write
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Message Flow

```
Popup → content script:   EXTRACT_CONTENT  → returns { title, bodyText, wordCount, ... }
Popup → background:       SUMMARIZE_PAGE   → returns { bullets, insights, ... }
Popup → background:       CLEAR_CACHE_FOR_URL
Popup → background:       GET_CACHED_SUMMARY
```

All messaging uses `chrome.runtime.sendMessage` with explicit `type` discriminators and validated `success/error` response shapes.

### Content Extraction (content.js)

Uses a multi-pass heuristic strategy:

1. **Semantic selectors** — `<article>`, `[role=main]`, `<main>`, common CMS class names
2. **Text density scoring** — scores `<div>`/`<section>` candidates by character count minus link density (inspired by Mozilla Readability)
3. **Body fallback** — strips known noise elements (`<nav>`, `<header>`, `<footer>`, `<aside>`, ads) and returns the remaining text

Content is capped at 12,000 characters before being sent to the AI (8,000 in the prompt) to control token cost.

### AI Integration (background.js)

The background service worker is the **only** place that handles API keys and external network requests. Keys are:
- Loaded from `chrome.storage.sync` at call time
- Never passed to content scripts
- Never logged or exposed in errors shown to users

Supports two providers:
- **OpenAI** — `POST /v1/chat/completions` with JSON mode prompt
- **Gemini** — `POST /v1beta/models/{model}:generateContent` with `responseMimeType: application/json`

The AI is prompted to return a strict JSON schema `{ bullets: string[], insights: string[] }`. The parser strips markdown fences and falls back to regex extraction if needed.

### Caching (background.js + chrome.storage.local)

Cache keys: `summary__<normalized-url>` (fragment stripped)
TTL: 30 minutes (configurable constant)
Cache is checked before every API call. The popup shows a "Showing cached summary" notice and a "Re-summarize" button to bypass it.

---

## AI Integration Explanation

The extension uses a **prompt-based JSON extraction** approach:

```
System: "You are a precise content summarizer. Always respond with valid JSON only."
User:   Page title + truncated body content (8,000 chars max)
        Requested bullet count
        Strict JSON schema instruction
```

The AI returns `{ bullets: string[], insights: string[] }`. The background worker parses and validates this before sending it to the popup. If parsing fails, the error is surfaced clearly.

---

## Security Decisions

| Decision | Rationale |
|---|---|
| API keys in `chrome.storage.sync` | Encrypted by Chrome, synced across user's devices, never in source code |
| API calls only in background service worker | Content scripts are injectable and more exposed; background worker is isolated |
| Keys never passed to content scripts | Content scripts run in page context and are more vulnerable to XSS |
| `textContent` (not `innerHTML`) for AI output | Prevents XSS from malicious AI responses or compromised providers |
| Input sanitization in content.js | Title/description sanitized before any use |
| Minimal permissions | `activeTab` (not `tabs`), `storage`, `scripting` — no `<all_urls>` tabs access |
| `host_permissions` scoped to AI APIs | Restricts outbound connections to only the two provider domains |

---

## Trade-offs

| Trade-off | Decision Made |
|---|---|
| No server-side proxy | A proxy would be more secure but requires hosting infrastructure. The background service worker approach is the standard pattern for extensions and provides strong isolation. |
| API key entered by user | Requires user setup but avoids bundling any key in the extension. Free-tier Gemini makes this low-friction. |
| 8,000 char content cap | Balances summarization quality against token cost. Long articles are still summarized well because the most important content is usually near the top. |
| 30-minute cache TTL | Balances freshness against API cost. News articles change; most content doesn't. |
| Two providers, not one | Gives users flexibility — OpenAI for quality, Gemini for free-tier access. |

---

## Permissions Explained

```json
"permissions": ["activeTab", "storage", "scripting"]
```

- `activeTab` — read content of the currently active tab only (not all tabs)
- `storage` — persist settings and cache
- `scripting` — inject content script if not already loaded (fallback)

```json
"host_permissions": [
  "https://api.openai.com/*",
  "https://generativelanguage.googleapis.com/*"
]
```

Only these two domains are reachable from the extension. No other outbound connections are made.

---

## Development

No build step required. The extension is plain HTML/CSS/JS (Manifest V3 compatible).

To make changes:
1. Edit the relevant file
2. Go to `chrome://extensions`
3. Click the **↺ refresh** icon on the extension card

To inspect the background service worker:
1. Go to `chrome://extensions`
2. Click **"Service Worker"** link under the extension

To inspect the popup:
1. Right-click the extension icon → **"Inspect popup"**
