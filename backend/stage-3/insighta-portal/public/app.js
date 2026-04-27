"use strict";

const BACKEND = "https://hng-internship-ivory.vercel.app";

let state = {
  user: null,
  csrfToken: null,
  page: 1,
  mode: "filter",
  nlQuery: "",
  filters: {},
};

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (state.csrfToken && ["POST", "PATCH", "PUT", "DELETE"].includes((opts.method || "GET").toUpperCase())) {
    headers["X-CSRF-Token"] = state.csrfToken;
  }
  return fetch(`${BACKEND}${path}`, { ...opts, headers, credentials: "include" });
}

async function apiJSON(path, opts = {}) {
  const res = await apiFetch(path, opts);
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const data = await apiJSON("/api/v2/auth/me");
    if (data.status === "success") {
      state.user = data.data;
      state.csrfToken = data.data.csrf_token;
      return true;
    }
  } catch {}
  return false;
}

async function tryRefresh() {
  try {
    const data = await apiJSON("/api/v2/auth/refresh", { method: "POST", body: JSON.stringify({}) });
    if (data.status === "success") return true;
  } catch {}
  return false;
}

function doLogin() {
  const portalUrl = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href = `${BACKEND}/api/v2/auth/github/login?client_type=web&redirect_uri=${portalUrl}`;
}

async function doLogout() {
  await apiFetch("/api/v2/auth/logout", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
  state.user = null;
  state.csrfToken = null;
  showLogin();
}

// ── UI transitions ────────────────────────────────────────────────────────────
function showLogin() {
  hide("dashboard-screen");
  show("login-screen");
}

function showDashboard() {
  hide("login-screen");
  show("dashboard-screen");
  $("nav-username").textContent = `@${state.user.username}`;
  const roleBadge = $("nav-role");
  roleBadge.textContent = state.user.role;
  roleBadge.className = "badge" + (state.user.role === "admin" ? " admin" : "");
  loadProfiles();
}

// ── Profiles ──────────────────────────────────────────────────────────────────
function getFilterParams() {
  const p = new URLSearchParams();
  const gender = $("f-gender").value;
  const ageGroup = $("f-age-group").value;
  const country = $("f-country").value.trim().toUpperCase();
  const minAge = $("f-min-age").value.trim();
  const maxAge = $("f-max-age").value.trim();
  const sort = $("f-sort").value;
  const order = $("f-order").value;

  if (gender) p.set("gender", gender);
  if (ageGroup) p.set("age_group", ageGroup);
  if (country) p.set("country_id", country);
  if (minAge) p.set("min_age", minAge);
  if (maxAge) p.set("max_age", maxAge);
  p.set("sort_by", sort);
  p.set("order", order);
  p.set("page", state.page);
  p.set("limit", "20");
  return p;
}

async function loadProfiles() {
  $("profiles-body").innerHTML = `<tr><td colspan="7" class="loading">Loading...</td></tr>`;
  $("results-info").textContent = "Loading...";

  let data;
  try {
    if (state.mode === "search" && state.nlQuery) {
      const p = new URLSearchParams({ q: state.nlQuery, page: state.page, limit: "20" });
      data = await apiJSON(`/api/v2/profiles/search?${p}`);
    } else {
      data = await apiJSON(`/api/v2/profiles?${getFilterParams()}`);
    }
  } catch (err) {
    $("profiles-body").innerHTML = `<tr><td colspan="7" class="loading">Network error. Please try again.</td></tr>`;
    return;
  }

  if (data.status !== "success") {
    $("profiles-body").innerHTML = `<tr><td colspan="7" class="loading">${data.message}</td></tr>`;
    $("results-info").textContent = data.message;
    return;
  }

  const pg = data.pagination;
  $("results-info").textContent = `${pg.total} profiles found`;
  $("page-info").textContent = `Page ${pg.page} of ${pg.total_pages || 1}`;
  $("prev-btn").disabled = !pg.has_prev;
  $("next-btn").disabled = !pg.has_next;

  if (!data.data.length) {
    $("profiles-body").innerHTML = `<tr><td colspan="7" class="loading">No profiles match your query.</td></tr>`;
    return;
  }

  $("profiles-body").innerHTML = data.data.map((r) => `
    <tr>
      <td>${esc(r.name)}</td>
      <td class="gender-${r.gender}">${r.gender}</td>
      <td>${r.age}</td>
      <td>${r.age_group}</td>
      <td>${r.country_id} — ${esc(r.country_name)}</td>
      <td class="prob">${(r.gender_probability * 100).toFixed(0)}%</td>
      <td class="prob">${(r.country_probability * 100).toFixed(0)}%</td>
    </tr>
  `).join("");
}

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function exportCSV() {
  const p = getFilterParams();
  try {
    const res = await apiFetch(`/api/v2/profiles/export?${p}`);
    if (!res.ok) { alert("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "profiles.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch { alert("Export error"); }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);

  // Clear URL params after reading
  if (params.has("login")) {
    window.history.replaceState({}, "", window.location.pathname);
  }

  let authed = await checkAuth();
  if (!authed && params.get("login") === "success") {
    authed = await tryRefresh().then(checkAuth);
  }

  if (authed) {
    showDashboard();
  } else {
    showLogin();
  }

  // Event listeners
  $("login-btn").addEventListener("click", doLogin);
  $("logout-btn").addEventListener("click", doLogout);

  $("nl-btn").addEventListener("click", () => {
    state.nlQuery = $("nl-input").value.trim();
    state.mode = "search";
    state.page = 1;
    loadProfiles();
  });

  $("nl-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("nl-btn").click();
  });

  $("filter-btn").addEventListener("click", () => {
    state.mode = "filter";
    state.page = 1;
    loadProfiles();
  });

  $("reset-btn").addEventListener("click", () => {
    $("f-gender").value = "";
    $("f-age-group").value = "";
    $("f-country").value = "";
    $("f-min-age").value = "";
    $("f-max-age").value = "";
    $("f-sort").value = "created_at";
    $("f-order").value = "asc";
    $("nl-input").value = "";
    state.mode = "filter";
    state.nlQuery = "";
    state.page = 1;
    loadProfiles();
  });

  $("export-btn").addEventListener("click", exportCSV);

  $("prev-btn").addEventListener("click", () => { if (state.page > 1) { state.page--; loadProfiles(); } });
  $("next-btn").addEventListener("click", () => { state.page++; loadProfiles(); });
}

document.addEventListener("DOMContentLoaded", init);
