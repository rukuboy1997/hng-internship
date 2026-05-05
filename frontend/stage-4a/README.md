# AI Page Summarizer — Chrome Extension

A **Manifest V3** Chrome extension that extracts the content of any webpage and generates a structured AI-powered summary: bullet points, key insights, and estimated reading time — in seconds.

Powered by **Google Gemini 2.5 Flash** via a secure proxy server. **No API key setup required for end users.**

---

## Features

- **Smart content extraction** — heuristic-based readability parser avoids navbars, sidebars, and footers
- **Structured AI output** — bullet summary + key insights, configurable bullet count (3–10)
- **Gemini 2.5 Flash** — fast, high-quality summarization via Google's latest model
- **Zero user configuration** — no API key entry required; works out of the box
- **Secure proxy architecture** — API key lives only on the server, never in the extension
- **Per-URL caching** — summaries cached for 30 minutes to avoid redundant API calls
- **Dark/light mode** — persisted theme toggle
- **Copy to clipboard** — one-click copy of the full summary
- **Graceful errors** — clear messages for rate limits and restricted pages

---

## Installation (Local / Unpacked)

> This extension is **not** published to the Chrome Web Store. Install it locally as an unpacked extension.

### Step 1 — Download the Extension

Download `chrome-extension.zip` from the `frontend/stage-4a/` folder in this repository and extract it. Or clone the repo:

```bash
git clone https://github.com/rukuboy1997/hng-internship.git
cd hng-internship/frontend/stage-4a
```

Extract `chrome-extension.zip` to get the extension folder.

### Step 2 — Open Chrome Extensions

1. Open Google Chrome
2. Navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)

### Step 3 — Load the Extension

1. Click **"Load unpacked"**
2. Select the extracted extension folder (the one containing `manifest.json`)
3. The extension will appear in your extensions list

### Step 4 — Pin the Extension (Optional)

1. Click the puzzle piece icon in the Chrome toolbar
2. Find **"AI Page Summarizer"** and click the pin icon

### Step 5 — Use It

1. Navigate to any article, blog post, or webpage
2. Click the extension icon
3. (Optional) Adjust the number of bullet points in the dropdown
4. Click **"Summarize Page"**

No API key required — the extension connects to the hosted proxy automatically.

---

## Usage

1. Navigate to any article, blog post, or webpage
2. Click the extension icon in the toolbar
3. (Optional) Adjust the number of bullet points (3 / 5 / 7 / 10)
4. Click **"Summarize Page"**
5. The extension will:
   - Extract readable content from the page
   - Send it to the proxy server, which calls Gemini 2.5 Flash
   - Display a bullet summary, key insights, reading time, and word count
6. Use **Copy** to copy the summary to your clipboard
7. Use **Re-summarize** to generate a fresh summary (bypasses cache)

---

## Architecture

```
frontend/stage-4a/
├── manifest.json         # Manifest V3 config — permissions, scripts, icons
├── popup.html            # Extension popup UI
├── popup.css             # Popup styles — dark/light mode
├── popup.js              # Popup logic — state machine, messaging, rendering
├── background.js         # Service worker — proxy calls, caching, error handling
├── content.js            # Content script — page content extraction heuristics
├── options.html          # Settings page — cache management only
├── options.css           # Settings page styles
├── options.js            # Settings page logic — cache clear
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── chrome-extension.zip  # Packaged extension ready to install
└── proxy-server/         # Vercel-deployable proxy (holds the API key)
    ├── api/
    │   └── summarize.js  # Serverless function — calls Gemini API
    ├── vercel.json       # Vercel configuration
    ├── package.json
    └── .env.example      # Environment variable template
```

### Message Flow

```
Popup → content script:   EXTRACT_CONTENT   → { title, bodyText, wordCount, ... }
Popup → background:       SUMMARIZE_PAGE    → { bullets, insights, ... }
Popup → background:       CLEAR_CACHE_FOR_URL
Popup → background:       GET_CACHED_SUMMARY
Background → Proxy:       POST /api/summarize → { bullets, insights }
Proxy → Gemini API:       generateContent (server-side, key never exposed)
```

### Content Extraction (content.js)

Multi-pass heuristic strategy:

1. **Semantic selectors** — `<article>`, `[role=main]`, `<main>`, common CMS class names
2. **Text density scoring** — scores `<div>`/`<section>` candidates by character count minus link density (inspired by Mozilla Readability)
3. **Body fallback** — strips known noise elements (`<nav>`, `<header>`, `<footer>`, `<aside>`) and returns remaining text

Content is capped at 12,000 characters before being sent (8,000 in the AI prompt) to control token cost.

### AI Integration

The background service worker calls the **proxy server** (not Gemini directly). The proxy:
- Receives `{ title, bodyText, bulletCount }` from the extension
- Builds the structured prompt
- Calls `gemini-2.5-flash` via the Gemini API (using the server-side API key)
- Returns `{ bullets: string[], insights: string[] }` to the extension

The AI responds with a strict JSON schema. The parser strips markdown fences and falls back to regex extraction if needed.

### Caching (background.js + chrome.storage.local)

- Cache keys: `summary__<normalized-url>` (fragment stripped)
- TTL: 30 minutes
- Cache checked before every proxy call
- "Showing cached summary" notice + "Re-summarize" button to bypass

---

## Security Decisions

| Decision | Rationale |
|---|---|
| API key on proxy server, not in extension | Key is never shipped in extension files, never in chrome.storage, never visible to users |
| Proxy server on Vercel | Serverless — no always-on infrastructure, scales automatically |
| API calls only from background service worker | Isolated from content scripts and page context |
| `textContent` (not `innerHTML`) for AI output | Prevents XSS from malicious AI responses |
| Input sanitization in content.js | Title/meta description sanitized before any use |
| Minimal permissions | `activeTab`, `storage`, `scripting` — no broad tab access |
| `host_permissions` scoped to `*.vercel.app` | Restricts outbound connections to proxy domain only |
| CORS on proxy | `Access-Control-Allow-Origin: *` — safe because the key is on the server, not in the response |

---

## Trade-offs

| Trade-off | Decision Made |
|---|---|
| Proxy server required | A proxy is needed to keep the API key off the client. Vercel's free tier makes this zero-cost to host. |
| Single provider (Gemini) | Simplifies user experience — no configuration needed. Gemini 2.5 Flash is fast and high-quality. |
| 8,000 char content cap | Balances summarization quality against token cost. Long articles are still summarized well. |
| 30-minute cache TTL | Balances freshness against proxy/API cost. |
| `*.vercel.app` host permission | Broad enough to work after redeployment; could be tightened to exact subdomain in production. |

---

## Proxy Server — Deployment Guide

The proxy server lives in `proxy-server/`. Deploy it to Vercel to get a live URL for the extension.

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy from the proxy-server folder:
   ```bash
   cd frontend/stage-4a/proxy-server
   vercel
   ```

3. Set the environment variable in the Vercel dashboard:
   - Go to your project → **Settings** → **Environment Variables**
   - Add: `GEMINI_API_KEY` = `your_gemini_api_key`

4. Redeploy for the env var to take effect:
   ```bash
   vercel --prod
   ```

5. Copy your deployment URL (e.g. `https://ai-summarizer-proxy.vercel.app`)

6. Update `PROXY_URL` in `background.js`:
   ```js
   const PROXY_URL = "https://your-project.vercel.app/api/summarize";
   ```

7. Re-package and reload the extension in Chrome.

---

## Permissions Explained

```json
"permissions": ["activeTab", "storage", "scripting"]
```

- `activeTab` — read content of the currently active tab only
- `storage` — persist theme preference and summary cache
- `scripting` — inject content script if not already loaded (fallback)

```json
"host_permissions": ["https://*.vercel.app/*"]
```

Only the Vercel proxy domain is reachable from the extension. No direct calls to Gemini from the client.

---

## Development

No build step required. Plain HTML/CSS/JS, Manifest V3 compatible.

To make changes:
1. Edit the relevant file
2. Go to `chrome://extensions`
3. Click the **↺ refresh** icon on the extension card

To inspect the background service worker:
1. Go to `chrome://extensions`
2. Click **"Service Worker"** link under the extension

To inspect the popup:
1. Right-click the extension icon → **"Inspect popup"**
