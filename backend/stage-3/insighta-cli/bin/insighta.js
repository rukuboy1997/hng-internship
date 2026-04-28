#!/usr/bin/env node

"use strict";

const { program } = require("commander");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const CREDS_DIR = path.join(os.homedir(), ".insighta");
const CREDS_FILE = path.join(CREDS_DIR, "credentials.json");
const DEFAULT_BACKEND = "https://hng-internship-ivory.vercel.app";

// ── Credential helpers ────────────────────────────────────────────────────────

function loadCreds() {
  try { return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8")); }
  catch { return null; }
}

function saveCreds(data) {
  if (!fs.existsSync(CREDS_DIR)) fs.mkdirSync(CREDS_DIR, { recursive: true });
  fs.writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function clearCreds() {
  try { fs.unlinkSync(CREDS_FILE); } catch {}
}

function getBackend(creds) {
  return (creds && creds.backend_url) || process.env.INSIGHTA_BACKEND || DEFAULT_BACKEND;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch { return null; }
}

function isExpired(token, bufferSecs = 30) {
  const p = decodeJwtPayload(token);
  if (!p || !p.exp) return true;
  return Date.now() / 1000 + bufferSecs > p.exp;
}

async function refreshIfNeeded(creds) {
  if (!creds || !creds.access_token) return null;
  if (!isExpired(creds.access_token)) return creds;
  try {
    const res = await fetch(`${getBackend(creds)}/api/v2/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: creds.refresh_token }),
    });
    const data = await res.json();
    if (data.status === "success") {
      const updated = { ...creds, access_token: data.access_token, refresh_token: data.refresh_token };
      saveCreds(updated);
      return updated;
    }
  } catch {}
  return null;
}

async function authedFetch(url, opts = {}) {
  let creds = loadCreds();
  if (!creds) { console.error("Not logged in. Run: insighta login"); process.exit(1); }
  creds = await refreshIfNeeded(creds);
  if (!creds) { console.error("Session expired. Run: insighta login"); process.exit(1); }
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${creds.access_token}` },
  });
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ── Local callback server ─────────────────────────────────────────────────────

function startCallbackServer(port) {
  return new Promise((resolveServer, rejectServer) => {
    const server = http.createServer();

    const authCodePromise = new Promise((resolveCode, rejectCode) => {
      server.on("request", (req, resp) => {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        const authCode = url.searchParams.get("auth_code");
        const error = url.searchParams.get("error");

        resp.writeHead(200, { "Content-Type": "text/html" });
        if (authCode) {
          resp.end(`<html><body style="font-family:sans-serif;text-align:center;padding:60px">
            <h2 style="color:#22c55e">Login successful!</h2>
            <p>You can close this tab and return to the terminal.</p>
          </body></html>`);
          server.close();
          resolveCode(authCode);
        } else {
          resp.end(`<html><body style="font-family:sans-serif;text-align:center;padding:60px">
            <h2 style="color:#ef4444">Login failed</h2>
            <p>${error || "Unknown error"}</p>
          </body></html>`);
          server.close();
          rejectCode(new Error(error || "OAuth failed"));
        }
      });
    });

    server.listen(port, "127.0.0.1", () => resolveServer(authCodePromise));
    server.on("error", rejectServer);
  });
}

// ── Table printer ─────────────────────────────────────────────────────────────

function printTable(rows, cols) {
  if (!rows.length) { console.log("No results."); return; }
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length))
  );
  const hr = (l, m, r) => l + widths.map((w) => "─".repeat(w + 2)).join(m) + r;
  console.log(hr("┌", "┬", "┐"));
  console.log("│" + cols.map((c, i) => ` ${c.padEnd(widths[i])} `).join("│") + "│");
  console.log(hr("├", "┼", "┤"));
  for (const row of rows) {
    console.log("│" + cols.map((c, i) => ` ${String(row[c] ?? "").padEnd(widths[i])} `).join("│") + "│");
  }
  console.log(hr("└", "┴", "┘"));
}

// ── Commands ──────────────────────────────────────────────────────────────────

program
  .name("insighta")
  .description("Insighta Labs+ CLI — demographic profile intelligence")
  .version("1.0.0");

// LOGIN
program
  .command("login")
  .description("Authenticate via GitHub OAuth (opens browser)")
  .option("--backend <url>", "Override backend URL", DEFAULT_BACKEND)
  .action(async (opts) => {
    const backend = opts.backend;
    const verifier = generateVerifier();
    const challenge = generateChallenge(verifier);
    const port = 7700 + Math.floor(Math.random() * 100);
    const redirectUri = `http://127.0.0.1:${port}/callback`;

    console.log("Starting OAuth flow...");

    let authCodePromise;
    try {
      authCodePromise = await startCallbackServer(port);
    } catch (err) {
      console.error("Failed to start local callback server:", err.message);
      process.exit(1);
    }

    const loginUrl = `${backend}/api/v2/auth/github/login?` + new URLSearchParams({
      code_challenge: challenge,
      code_challenge_method: "S256",
      redirect_uri: redirectUri,
      client_type: "cli",
    });

    console.log("Opening browser...");
    console.log("If it does not open automatically, visit:\n" + loginUrl + "\n");

    try {
      const { default: open } = await import("open");
      await open(loginUrl);
    } catch {
      console.log("Could not open browser automatically. Visit the URL above.");
    }

    console.log("Waiting for GitHub login...");
    let authCode;
    try {
      authCode = await authCodePromise;
    } catch (err) {
      console.error("Login cancelled:", err.message);
      process.exit(1);
    }

    try {
      const res = await fetch(`${backend}/api/v2/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_code: authCode, code_verifier: verifier }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        console.error("Token exchange failed:", data.message);
        process.exit(1);
      }
      saveCreds({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
        backend_url: backend,
      });
      console.log(`\nLogged in as ${data.user.username} (${data.user.role}) ✓`);
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  });

// WHOAMI
program
  .command("whoami")
  .description("Show currently logged-in user")
  .action(async () => {
    const creds = loadCreds();
    if (!creds) { console.error("Not logged in. Run: insighta login"); process.exit(1); }
    const res = await authedFetch(`${getBackend(creds)}/api/v2/auth/me`);
    const data = await res.json();
    if (data.status !== "success") { console.error(data.message); process.exit(1); }
    const u = data.data;
    console.log(`\nUsername : ${u.username}`);
    console.log(`Email    : ${u.email || "(none)"}`);
    console.log(`Role     : ${u.role}`);
    console.log(`Joined   : ${u.created_at}\n`);
  });

// PROFILES
program
  .command("profiles")
  .description("List demographic profiles with optional filters")
  .option("--gender <male|female>", "Filter by gender")
  .option("--age-group <group>", "Filter: child | teenager | adult | senior")
  .option("--country <code>", "Country code (e.g. NG, GH, KE)")
  .option("--min-age <n>", "Minimum age")
  .option("--max-age <n>", "Maximum age")
  .option("--sort-by <field>", "age | created_at | gender_probability", "created_at")
  .option("--order <asc|desc>", "asc or desc", "asc")
  .option("--page <n>", "Page number", "1")
  .option("--limit <n>", "Results per page (max 50)", "10")
  .option("--json", "Output raw JSON")
  .action(async (opts) => {
    const creds = loadCreds();
    const params = new URLSearchParams();
    if (opts.gender) params.set("gender", opts.gender);
    if (opts.ageGroup) params.set("age_group", opts.ageGroup);
    if (opts.country) params.set("country_id", opts.country.toUpperCase());
    if (opts.minAge) params.set("min_age", opts.minAge);
    if (opts.maxAge) params.set("max_age", opts.maxAge);
    params.set("sort_by", opts.sortBy || "created_at");
    params.set("order", opts.order || "asc");
    params.set("page", opts.page);
    params.set("limit", opts.limit);

    const res = await authedFetch(`${getBackend(creds)}/api/v2/profiles?${params}`);
    const data = await res.json();
    if (data.status !== "success") { console.error(data.message); process.exit(1); }

    if (opts.json) { console.log(JSON.stringify(data, null, 2)); return; }

    const p = data.pagination;
    console.log(`\nPage ${p.page}/${p.total_pages} — ${p.total} total profiles\n`);
    printTable(data.data, ["name", "gender", "age", "age_group", "country_id", "country_name"]);
    if (p.has_next) console.log(`\n  → Next page: insighta profiles ... --page ${p.page + 1}`);
    console.log();
  });

// SEARCH
program
  .command("search <query>")
  .description('Natural language profile search (e.g. "young males from Nigeria")')
  .option("--page <n>", "Page number", "1")
  .option("--limit <n>", "Results per page", "10")
  .option("--json", "Output raw JSON")
  .action(async (query, opts) => {
    const creds = loadCreds();
    const params = new URLSearchParams({ q: query, page: opts.page, limit: opts.limit });
    const res = await authedFetch(`${getBackend(creds)}/api/v2/profiles/search?${params}`);
    const data = await res.json();

    if (data.status === "error") {
      console.error(data.message);
      process.exit(data.message === "Unable to interpret query" ? 0 : 1);
    }
    if (opts.json) { console.log(JSON.stringify(data, null, 2)); return; }

    const p = data.pagination;
    console.log(`\nQuery: "${query}"`);
    console.log(`Found ${p.total} result(s) — page ${p.page}/${p.total_pages}\n`);
    printTable(data.data, ["name", "gender", "age", "age_group", "country_id", "country_name"]);
    console.log();
  });

// EXPORT
program
  .command("export")
  .description("Export profiles as CSV")
  .option("--gender <gender>", "Filter by gender")
  .option("--age-group <group>", "Filter by age group")
  .option("--country <code>", "Filter by country code")
  .option("--min-age <n>", "Minimum age")
  .option("--max-age <n>", "Maximum age")
  .option("--output <file>", "Write to file instead of stdout")
  .action(async (opts) => {
    const creds = loadCreds();
    const params = new URLSearchParams();
    if (opts.gender) params.set("gender", opts.gender);
    if (opts.ageGroup) params.set("age_group", opts.ageGroup);
    if (opts.country) params.set("country_id", opts.country.toUpperCase());
    if (opts.minAge) params.set("min_age", opts.minAge);
    if (opts.maxAge) params.set("max_age", opts.maxAge);

    const res = await authedFetch(`${getBackend(creds)}/api/v2/profiles/export?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Export failed" }));
      console.error(err.message);
      process.exit(1);
    }
    const csv = await res.text();
    if (opts.output) {
      fs.writeFileSync(opts.output, csv, "utf8");
      const lines = csv.split("\n").length - 2;
      console.log(`Exported ${lines} profiles to ${opts.output}`);
    } else {
      process.stdout.write(csv);
    }
  });

// LOGOUT
program
  .command("logout")
  .description("Clear stored credentials and revoke session")
  .action(async () => {
    const creds = loadCreds();
    if (creds) {
      await fetch(`${getBackend(creds)}/api/v2/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${creds.access_token}` },
        body: JSON.stringify({ refresh_token: creds.refresh_token }),
      }).catch(() => {});
    }
    clearCreds();
    console.log("Logged out. Credentials cleared.");
  });

program.parse();
