/**
 * Options Page Script — AI Page Summarizer
 * Manages settings: provider, model, API key, cache controls.
 */

"use strict";

// ─── DOM References ───────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const ui = {
  providerOpenAI:  $("provider-openai"),
  providerGemini:  $("provider-gemini"),
  cardOpenAI:      $("card-openai"),
  cardGemini:      $("card-gemini"),
  apiKeyInput:     $("apiKeyInput"),
  modelInput:      $("modelInput"),
  modelHint:       $("modelHint"),
  openaiLink:      $("openaiLink"),
  geminiLink:      $("geminiLink"),
  toggleKey:       $("toggleKey"),
  eyeOpen:         document.querySelector(".eye-open"),
  eyeClosed:       document.querySelector(".eye-closed"),
  saveBtn:         $("saveBtn"),
  saveNotice:      $("saveNotice"),
  clearCacheBtn:   $("clearCacheBtn"),
  cacheStatus:     $("cacheStatus"),
};

// ─── Provider Config ──────────────────────────────────────────────────────────

const PROVIDER_META = {
  openai: {
    modelHint: 'OpenAI defaults: <code>gpt-4o-mini</code> (fast) or <code>gpt-4o</code> (higher quality)',
    modelPlaceholder: 'e.g. gpt-4o-mini',
    keyPlaceholder: 'sk-…',
  },
  gemini: {
    modelHint: 'Gemini defaults: <code>gemini-1.5-flash</code> (fast) or <code>gemini-1.5-pro</code> (higher quality)',
    modelPlaceholder: 'e.g. gemini-1.5-flash',
    keyPlaceholder: 'AIza…',
  },
};

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  bindEvents();
});

// ─── Load Settings ────────────────────────────────────────────────────────────

async function loadSettings() {
  const { apiKey, provider, model } = await chrome.storage.sync.get([
    "apiKey",
    "provider",
    "model",
  ]);

  const activeProvider = provider || "openai";
  selectProvider(activeProvider);

  ui.apiKeyInput.value = apiKey || "";
  ui.modelInput.value = model || "";
}

// ─── Events ───────────────────────────────────────────────────────────────────

function bindEvents() {
  // Provider radio
  [ui.providerOpenAI, ui.providerGemini].forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) selectProvider(radio.value);
    });
  });

  // Radio card click (the label handles it, but we also support keyboard)
  [ui.cardOpenAI, ui.cardGemini].forEach((card) => {
    card.addEventListener("click", () => {
      const radio = card.querySelector("input[type=radio]");
      if (radio) {
        radio.checked = true;
        selectProvider(radio.value);
      }
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "radio");
  });

  // Toggle key visibility
  ui.toggleKey.addEventListener("click", () => {
    const isPassword = ui.apiKeyInput.type === "password";
    ui.apiKeyInput.type = isPassword ? "text" : "password";
    ui.eyeOpen.style.display  = isPassword ? "none" : "";
    ui.eyeClosed.style.display = isPassword ? "" : "none";
  });

  // Save
  ui.saveBtn.addEventListener("click", saveSettings);

  // Clear cache
  ui.clearCacheBtn.addEventListener("click", clearAllCache);

  // Keyboard save (Ctrl/Cmd+S)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveSettings();
    }
  });
}

// ─── Provider Selection ───────────────────────────────────────────────────────

function selectProvider(provider) {
  // Update radio state
  ui.providerOpenAI.checked = provider === "openai";
  ui.providerGemini.checked = provider === "gemini";

  // Update card visual state
  ui.cardOpenAI.classList.toggle("selected", provider === "openai");
  ui.cardGemini.classList.toggle("selected", provider === "gemini");

  // Update aria-checked for screen readers
  ui.cardOpenAI.setAttribute("aria-checked", provider === "openai");
  ui.cardGemini.setAttribute("aria-checked", provider === "gemini");

  // Update model hints & placeholders
  const meta = PROVIDER_META[provider] || PROVIDER_META.openai;
  ui.modelHint.innerHTML = meta.modelHint;
  ui.modelInput.placeholder = meta.modelPlaceholder;
  ui.apiKeyInput.placeholder = meta.keyPlaceholder;

  // Update API key links
  ui.openaiLink.style.display = provider === "openai" ? "" : "none";
  ui.geminiLink.style.display = provider === "gemini" ? "" : "none";
}

// ─── Save Settings ────────────────────────────────────────────────────────────

async function saveSettings() {
  const provider = ui.providerOpenAI.checked ? "openai" : "gemini";
  const apiKey   = ui.apiKeyInput.value.trim();
  const model    = ui.modelInput.value.trim();

  // Basic validation
  if (!apiKey) {
    ui.apiKeyInput.focus();
    ui.apiKeyInput.classList.add("input--error");
    setTimeout(() => ui.apiKeyInput.classList.remove("input--error"), 1500);
    return;
  }

  ui.saveBtn.disabled = true;
  ui.saveBtn.textContent = "Saving…";

  try {
    await chrome.storage.sync.set({ apiKey, provider, model });

    // Show success notice
    ui.saveNotice.style.display = "flex";
    setTimeout(() => {
      ui.saveNotice.style.display = "none";
    }, 3000);
  } catch (err) {
    console.error("Failed to save settings:", err);
    alert("Could not save settings. Please try again.");
  } finally {
    ui.saveBtn.disabled = false;
    ui.saveBtn.textContent = "Save Settings";
  }
}

// ─── Cache Management ─────────────────────────────────────────────────────────

async function clearAllCache() {
  ui.clearCacheBtn.disabled = true;
  ui.clearCacheBtn.textContent = "Clearing…";

  try {
    // Get all keys and remove those that start with our cache prefix
    const allData = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allData).filter((k) =>
      k.startsWith("summary__")
    );

    if (cacheKeys.length === 0) {
      ui.cacheStatus.textContent = "No cached summaries to clear.";
    } else {
      await chrome.storage.local.remove(cacheKeys);
      ui.cacheStatus.textContent = `Cleared ${cacheKeys.length} cached summary${cacheKeys.length !== 1 ? "ies" : ""}.`;
    }

    setTimeout(() => {
      ui.cacheStatus.textContent = "";
    }, 3000);
  } catch (err) {
    ui.cacheStatus.textContent = "Error clearing cache.";
  } finally {
    ui.clearCacheBtn.disabled = false;
    ui.clearCacheBtn.textContent = "Clear All Cached Summaries";
  }
}
