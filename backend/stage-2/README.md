# Insighta Labs+ — Backend API

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│  Clients                                             │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  Web Portal  │  │  CLI Tool    │                 │
│  │ (HTTP cookie)│  │(Bearer token)│                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         └────────┬─────────┘                         │
└──────────────────┼──────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│  Express API (Vercel Serverless)                     │
│                                                      │
│  /api/profiles          ← Stage 2 (public)          │
│  /api/v2/auth/*         ← OAuth + tokens            │
│  /api/v2/profiles/*     ← Protected (JWT)           │
│                                                      │
│  Middleware: CORS → cookies → rate-limit →          │
│  authenticate → authorize → CSRF → logger → route   │
└─────────────────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────┐
│  Neon PostgreSQL                                     │
│  profiles · users · refresh_tokens                  │
│  oauth_states · auth_codes · request_logs           │
└─────────────────────────────────────────────────────┘
```

## Authentication Flow

### CLI (PKCE)
1. CLI generates `code_verifier` (32 random bytes, base64url) and `code_challenge` (SHA-256 of verifier, base64url)
2. CLI starts a local HTTP server on `127.0.0.1:PORT`
3. CLI calls `GET /api/v2/auth/github/login?code_challenge=...&code_challenge_method=S256&redirect_uri=http://127.0.0.1:PORT/callback&client_type=cli`
4. Backend stores state+challenge in DB, redirects browser to GitHub OAuth
5. GitHub redirects to `/api/v2/auth/github/callback`
6. Backend exchanges GitHub code for user info, upserts user, generates a short-lived `auth_code` (5 min), redirects to CLI callback URL
7. CLI receives `auth_code`, calls `POST /api/v2/auth/token` with `{auth_code, code_verifier}`
8. Backend verifies PKCE (`SHA256(code_verifier) == code_challenge`), issues JWT access token (15 min) + opaque refresh token (7 days)
9. CLI stores tokens at `~/.insighta/credentials.json`

### Web Portal (HTTP-only cookies)
1. Portal navigates to `GET /api/v2/auth/github/login?client_type=web&redirect_uri=PORTAL_URL`
2. Same GitHub OAuth flow as above
3. Backend sets `access_token` and `refresh_token` as HTTP-only, SameSite=None, Secure cookies
4. CSRF token embedded in JWT payload, returned via `GET /api/v2/auth/me` response body
5. Portal sends `X-CSRF-Token` header on all state-mutating requests

## CLI Usage

```bash
npm install -g insighta-labs-cli

insighta login                           # GitHub OAuth (opens browser)
insighta whoami                          # Show current user
insighta profiles --gender male --country NG --page 1
insighta profiles --age-group adult --min-age 25 --max-age 45
insighta search "young females from Ghana"
insighta export --country NG --output nigeria.csv
insighta logout
```

## Token Handling

| Token         | Type   | Storage                 | Expiry | Rotation        |
|---------------|--------|-------------------------|--------|-----------------|
| Access token  | JWT    | CLI: file / Web: cookie | 15 min | On each refresh |
| Refresh token | Opaque | CLI: file / Web: cookie | 7 days | On each use     |

- Refresh tokens are **single-use** (rotated on every refresh)
- Refresh token is SHA-256 hashed before DB storage
- Revoked tokens tracked via `revoked_at` timestamp

## Role Enforcement

Roles: `admin` | `analyst`

- **First GitHub login** → role `admin`
- **All subsequent logins** → role `analyst` (admin can promote via `PATCH /api/v2/auth/users/:id/role`)
- All `/api/v2/profiles/*` endpoints require authentication (both roles)
- User management (`GET /api/v2/auth/users`, `PATCH /api/v2/auth/users/:id/role`) requires `admin`

## Natural Language Parsing Approach

The parser is rule-based and operates in this order:

1. **Gender** — regex for `male/males/men/man/boys` → male; `female/females/women/woman/girls` → female. "male and female" / "both" clears the filter.
2. **Age group** — `children/child/kids` → child · `teenagers/teens` → teenager · `adults` → adult · `seniors/elderly/old people` → senior
3. **"Young" shortcut** — maps to ages 16–24 when no age group matched
4. **Numeric age constraints** — `above/over/older than N` → min_age · `below/under/younger than N` → max_age · `between X and Y` → range · `aged N` → exact
5. **Country lookup** — ~55 country names sorted longest-first to avoid partial matches (e.g. "guinea-bissau" before "guinea"). Returns ISO 3166-1 alpha-2 code.

**Limitations:** no compound "or" queries · no probability NL constraints · multi-country not supported

## API Versioning

| Endpoint                              | Auth    | Notes                    |
|---------------------------------------|---------|--------------------------|
| `GET /api/profiles`                   | Public  | Stage 2 preserved        |
| `GET /api/profiles/search`            | Public  | Stage 2 preserved        |
| `GET /api/v2/profiles`                | Auth    | Updated pagination shape |
| `GET /api/v2/profiles/search`         | Auth    | Updated pagination shape |
| `GET /api/v2/profiles/export`         | Auth    | CSV download             |
| `GET /api/v2/auth/github/login`       | Public  | Start OAuth              |
| `GET /api/v2/auth/github/callback`    | Public  | OAuth callback           |
| `POST /api/v2/auth/token`             | Public  | PKCE token exchange      |
| `POST /api/v2/auth/refresh`           | Public  | Refresh tokens           |
| `POST /api/v2/auth/logout`            | Public  | Revoke session           |
| `GET /api/v2/auth/me`                 | Auth    | Current user + CSRF      |
| `GET /api/v2/auth/users`             | Admin   | List all users           |
| `PATCH /api/v2/auth/users/:id/role`  | Admin   | Change user role         |

## v2 Pagination Shape

```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2026,
    "total_pages": 203,
    "has_next": true,
    "has_prev": false
  }
}
```

## Environment Variables

| Variable               | Required | Description                               |
|------------------------|----------|-------------------------------------------|
| `DATABASE_URL`         | Yes      | Neon PostgreSQL connection string         |
| `JWT_SECRET`           | Yes      | Secret for signing JWT tokens             |
| `GITHUB_CLIENT_ID`     | Yes      | GitHub OAuth App client ID                |
| `GITHUB_CLIENT_SECRET` | Yes      | GitHub OAuth App client secret            |
| `BACKEND_URL`          | Yes      | Deployed backend URL (for OAuth callback) |
| `PORTAL_URL`           | No       | Portal origin for CORS + cookie redirect  |
