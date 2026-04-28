# Insighta Labs+ Stage 3 — Backend API

A production-ready Node.js/Express REST API with GitHub OAuth (PKCE), JWT authentication, RBAC, API versioning, CSV export, rate limiting, request logging, and CSRF protection.

**Live API:** https://hng-internship-ivory.vercel.app  
**Portal:** https://stage-3-insighta-portal.vercel.app  
**CLI:** `npm install -g insighta-labs-cli`

---

## Authentication Flow

This API uses **GitHub OAuth 2.0 with PKCE** for secure authentication.

```
Client                     Backend                    GitHub
  |                           |                          |
  |-- GET /auth/github ------>|                          |
  |   ?code_challenge=<hash>  |-- 302 to GitHub OAuth -->|
  |   &client_type=cli        |   ?state=<random>        |
  |                           |                          |
  |<-- 302 to GitHub login ---|                          |
  |                           |<-- callback?code=... ----|
  |                           |-- exchange code for AT ->|
  |                           |<-- GitHub access token --|
  |                           |-- upsert user in DB      |
  |<-- auth_code returned ----|   (first user = admin)   |
  |                           |
  |-- POST /auth/token ------>|
  |   { auth_code,            |
  |     code_verifier }       |-- PKCE verify
  |                           |
  |<-- { access_token,        |
  |      refresh_token } -----|
```

### Tokens

| Token | Type | TTL | Storage |
|---|---|---|---|
| Access token | JWT (HS256) | 15 minutes | Cookie / Authorization header |
| Refresh token | Opaque (hashed) | 7 days | HTTP-only cookie / body |

---

## Endpoints

### Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/auth/github` | Initiate GitHub OAuth (PKCE) | — |
| GET | `/auth/github/callback` | GitHub OAuth callback | — |
| POST | `/auth/token` | Exchange auth_code for tokens | — |
| POST | `/auth/refresh` | Rotate refresh token | — |
| POST | `/auth/logout` | Revoke refresh token | — |
| GET | `/api/users/me` | Current user profile | ✓ |

> All routes also available under `/api/v2/auth/` prefix.

### Profiles (v1 — auth required)

| Method | Path | Description |
|---|---|---|
| GET | `/api/profiles` | List profiles (paginated, filterable) |

**Query params:** `page`, `limit`, `gender`, `age_group`, `country_id`, `min_age`, `max_age`, `search`

### Profiles (v2 — auth + CSRF required)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v2/profiles` | List profiles (new pagination shape) |
| GET | `/api/v2/profiles/:id` | Single profile |
| GET | `/api/v2/profiles/export/csv` | Export as CSV |

### Admin only

| Method | Path | Description |
|---|---|---|
| GET | `/api/v2/auth/users` | List all users |
| PATCH | `/api/v2/auth/users/:id/role` | Change user role |

---

## RBAC

| Role | Capabilities |
|---|---|
| `admin` | First registered user; can manage all users and roles |
| `analyst` | All subsequent users; read-only access to profiles |

---

## Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `/auth/github` | 10 req | 15 min |
| `/api/v2/*` (unauthenticated) | 100 req | 15 min |
| `/api/v2/*` (authenticated) | 1000 req | 60 min |

---

## PKCE Flow (CLI / public clients)

1. Client generates `code_verifier` (random 32+ bytes, base64url-encoded)
2. Client computes `code_challenge = BASE64URL(SHA256(code_verifier))`
3. Client calls `GET /auth/github?code_challenge=<hash>&code_challenge_method=S256&client_type=cli&redirect_uri=<local>`
4. After GitHub callback, server issues `auth_code` and redirects to `redirect_uri?auth_code=<code>`
5. Client calls `POST /auth/token` with `{ auth_code, code_verifier }` — server verifies PKCE and issues tokens

---

## CSRF Protection

All mutating V2 requests require `X-CSRF-Token` header. The token is returned by `GET /api/users/me` in the `csrf_token` field and embedded in the access token JWT payload.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Secret for signing JWTs (32+ chars) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `BACKEND_URL` | Public URL of this API |
| `PORTAL_URL` | Public URL of the web portal (CORS) |

---

## CLI

```bash
npm install -g insighta-labs-cli

insighta login          # GitHub OAuth via browser + PKCE
insighta whoami         # Show current user
insighta profiles       # Browse profiles
insighta search <term>  # Search profiles
insighta export         # Download CSV
insighta logout         # Clear credentials
```

---

## Database Schema

```sql
profiles      (id, name, gender, gender_probability, age, age_group, country_id, country_name, country_probability, created_at)
users         (id, github_id, username, email, avatar_url, role, created_at)
refresh_tokens(id, user_id, token_hash, expires_at, created_at, revoked_at)
oauth_states  (state, code_challenge, code_challenge_method, redirect_uri, client_type, expires_at, created_at)
auth_codes    (code_hash, user_id, code_challenge, code_challenge_method, expires_at, created_at)
request_logs  (id, user_id, method, path, status_code, ip, response_time_ms, created_at)
```

---

## Running Locally

```bash
git clone https://github.com/<your-username>/hng-internship
cd hng-internship
npm install
cp .env.example .env  # fill in env vars
npm start
```

---

## Project Structure

```
├── index.js              # Express app entry point
├── db.js                 # PostgreSQL pool
├── migrations.js         # Auto-run table migrations
├── routes/
│   ├── profiles.js       # V1 public profiles
│   ├── auth.js           # GitHub OAuth + token management
│   └── v2/
│       └── profiles.js   # V2 auth-protected profiles + CSV
├── middleware/
│   ├── authenticate.js   # JWT + cookie validation
│   ├── authorize.js      # RBAC role check
│   ├── csrf.js           # CSRF token validation
│   ├── rateLimiter.js    # Express rate limiting
│   └── requestLogger.js  # DB request logging
└── scripts/
    └── seed.js           # Seed 2026 profiles
```
