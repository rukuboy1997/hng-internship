/**
 * Content Script — AI Page Summarizer
 * Responsible for extracting readable content from the current page.
 * Runs in the context of the page, isolated from extension JS.
 */

"use strict";

// Listen for messages from the popup / background worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_CONTENT") {
    try {
      const result = extractPageContent();
      sendResponse({ success: true, data: result });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  // Return true to keep the channel open for async response (not needed here,
  // but kept as a safety net for future async extraction).
  return true;
});

/**
 * Extract the most meaningful readable content from the current page.
 * Applies a series of heuristics to avoid nav, sidebar, footer noise.
 */
function extractPageContent() {
  const title = sanitizeText(document.title || "");
  const url = window.location.href;
  const metaDescription = getMetaDescription();

  const bodyText = extractMainText();
  const wordCount = countWords(bodyText);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    title,
    url,
    metaDescription,
    bodyText: bodyText.slice(0, 12000), // Cap to avoid huge payloads
    wordCount,
    readingTimeMinutes,
  };
}

/**
 * Get meta description if present.
 */
function getMetaDescription() {
  const el =
    document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]');
  return el ? sanitizeText(el.getAttribute("content") || "") : "";
}

/**
 * Extract main readable text using a multi-pass heuristic strategy.
 * Priority: <article> > [role=main] > <main> > scored candidates > <body>
 */
function extractMainText() {
  // 1. Try semantic article containers first
  const semanticSelectors = [
    "article",
    '[role="main"]',
    "main",
    ".post-content",
    ".article-content",
    ".entry-content",
    ".content-body",
    "#content",
    "#main-content",
    ".story-body",
    ".post-body",
    '[itemprop="articleBody"]',
  ];

  for (const selector of semanticSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = extractTextFromElement(el);
      if (text.length > 300) return text;
    }
  }

  // 2. Score all block-level candidates by text density
  const scored = scoreContentCandidates();
  if (scored.length > 0 && scored[0].score > 50) {
    return extractTextFromElement(scored[0].element);
  }

  // 3. Fallback: whole body minus known noise elements
  return extractTextFromBody();
}

/**
 * Score content candidates by text density (inspired by Readability.js).
 */
function scoreContentCandidates() {
  const NOISE_SELECTORS = [
    "nav", "header", "footer", "aside",
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    ".nav", ".navigation", ".sidebar", ".widget", ".ad", ".advertisement",
    ".comment", ".comments", ".footer", ".header", ".menu",
    "script", "style", "noscript", "iframe",
  ];

  const noiseSet = new Set();
  NOISE_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => noiseSet.add(el));
  });

  const isNoise = (el) => {
    let node = el;
    while (node) {
      if (noiseSet.has(node)) return true;
      node = node.parentElement;
    }
    return false;
  };

  const candidates = [];
  const blocks = document.querySelectorAll(
    "div, section, td, blockquote, pre"
  );

  blocks.forEach((el) => {
    if (isNoise(el)) return;
    const text = el.innerText || "";
    const charCount = text.length;
    const linkDensity = getLinkDensity(el, text);

    // Penalise heavy-link blocks (nav-like)
    if (linkDensity > 0.5) return;

    const score = charCount * (1 - linkDensity);
    if (score > 100) {
      candidates.push({ element: el, score });
    }
  });

  // Return highest-scoring, de-duped candidates (avoid nested ancestors)
  candidates.sort((a, b) => b.score - a.score);
  const result = [];
  for (const c of candidates) {
    const isChild = result.some((r) => r.element.contains(c.element));
    const isParent = result.some((r) => c.element.contains(r.element));
    if (!isChild && !isParent) result.push(c);
    if (result.length >= 3) break;
  }
  return result;
}

/**
 * Calculate link character density within an element.
 */
function getLinkDensity(el, text) {
  const links = el.querySelectorAll("a");
  let linkChars = 0;
  links.forEach((a) => (linkChars += (a.innerText || "").length));
  return text.length > 0 ? linkChars / text.length : 0;
}

/**
 * Extract clean text from an element, stripping scripts/styles.
 */
function extractTextFromElement(el) {
  // Clone to avoid mutating the live DOM
  const clone = el.cloneNode(true);
  clone
    .querySelectorAll("script, style, noscript, svg, canvas, iframe")
    .forEach((n) => n.remove());

  const raw = clone.innerText || clone.textContent || "";
  return normalizeWhitespace(raw);
}

/**
 * Fallback: extract text from body, removing obvious noise.
 */
function extractTextFromBody() {
  const clone = document.body.cloneNode(true);
  const REMOVE = [
    "script", "style", "noscript", "nav", "header", "footer",
    "aside", "iframe", "svg", "canvas", '[role="navigation"]',
    '[role="banner"]', ".nav", ".sidebar", ".ad", ".advertisement",
  ];
  REMOVE.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((n) => n.remove());
  });
  return normalizeWhitespace(clone.innerText || clone.textContent || "");
}

/**
 * Normalize whitespace in extracted text.
 */
function normalizeWhitespace(text) {
  return text
    .replace(/\t/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Count words in a string.
 */
function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Sanitize a text string to prevent XSS if ever rendered as HTML.
 * Used for title / meta description only.
 */
function sanitizeText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .trim();
}
