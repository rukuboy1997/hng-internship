# Habit Tracker PWA

A mobile-first Progressive Web App for tracking daily habits, built with Next.js, React, TypeScript, and Tailwind CSS. All data is persisted locally using localStorage.

## Project Overview

The app allows users to:
- Sign up and log in with email/password (local auth, no external service)
- Create, edit, and delete habits
- Mark habits complete/incomplete for today
- View a live streak counter per habit
- Reload and retain all data (localStorage persistence)
- Install the app as a PWA and use it offline

## Setup Instructions

```bash
# From the project root
pnpm install

# Or from this directory
npm install
```

## Run Instructions

```bash
# Development server
npm run dev

# Production build
npm run build

# Production server
npm run start
```

The dev server starts at `http://localhost:3000` (or the `PORT` env var).

## Test Instructions

```bash
# Unit tests with coverage report
npm run test:unit

# Integration/component tests
npm run test:integration

# End-to-end tests (requires the dev server to be running or Playwright will start it automatically)
npm run test:e2e

# Run all tests
npm run test
```

### Playwright Setup (for E2E tests)

Install Playwright browsers before running E2E tests:

```bash
npx playwright install chromium
```

### Coverage Report

After running `npm run test:unit`, a coverage report is generated in `coverage/`. View it by opening `coverage/index.html`.

## Local Persistence Structure

All state is stored in the browser's `localStorage` using three keys:

| Key | Description |
|-----|-------------|
| `habit-tracker-users` | JSON array of `User` objects |
| `habit-tracker-session` | JSON `Session` object or `null` |
| `habit-tracker-habits` | JSON array of `Habit` objects |

**User shape:**
```ts
{ id: string; email: string; password: string; createdAt: string }
```

**Session shape:**
```ts
{ userId: string; email: string }
```

**Habit shape:**
```ts
{
  id: string; userId: string; name: string; description: string;
  frequency: 'daily'; createdAt: string; completions: string[]
}
```

`completions` contains unique ISO dates (`YYYY-MM-DD`) representing completed days.

## PWA Support

The app implements PWA features via two files in `public/`:

- **`manifest.json`** — Declares app metadata (name, icons, theme color, display mode) enabling "Add to Home Screen"
- **`sw.js`** — A service worker that caches the app shell on install and serves cached assets when offline

The service worker is registered via an inline script in `src/app/layout.tsx`. On first load, it caches the app shell routes and static assets. On subsequent loads—including offline—the cache is served first, with network fallback.

## Trade-offs and Limitations

- **No server-side auth** — passwords are stored in plain text in localStorage. This is intentional per the spec ("front-end-focused, no external auth service")
- **Single frequency** — only `daily` frequency is implemented per spec requirements
- **No cloud sync** — all data is device-local; clearing localStorage wipes all data
- **Service worker in dev** — SW caching may interfere with hot reload in development; hard-refresh (`Shift+F5`) clears the cache

## Test File Map

| File | What it verifies |
|------|-----------------|
| `tests/unit/slug.test.ts` | `getHabitSlug()` — lowercase conversion, hyphenation, trimming, special character removal |
| `tests/unit/validators.test.ts` | `validateHabitName()` — empty input, max-length enforcement, trimmed return value |
| `tests/unit/streaks.test.ts` | `calculateCurrentStreak()` — empty completions, today-not-completed, consecutive days, duplicates, streak breaks |
| `tests/unit/habits.test.ts` | `toggleHabitCompletion()` — add date, remove date, no mutation, no duplicates |
| `tests/integration/auth-flow.test.tsx` | Signup form creates a session, duplicate email rejection, login stores session, invalid credentials error |
| `tests/integration/habit-form.test.tsx` | Validation errors, create+render in list, edit preserves immutable fields, delete confirmation flow, completion toggles streak |
| `tests/e2e/app.spec.ts` | Full browser flows: splash redirect, auth redirect, protected routes, signup, login isolation, create habit, complete+streak, persistence after reload, logout, offline app shell |

## Implementation Map

| Requirement | Implementation |
|------------|---------------|
| Routes (`/`, `/login`, `/signup`, `/dashboard`) | `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/dashboard/page.tsx` |
| Splash screen with 800-2000ms delay | `src/app/page.tsx` (1000ms), `src/components/shared/SplashScreen.tsx` |
| Protected route | `src/components/shared/ProtectedRoute.tsx` |
| localStorage persistence | `src/lib/storage.ts` |
| Auth logic | `src/lib/auth.ts` |
| Habit CRUD | `src/lib/habits.ts` |
| Streak calculation | `src/lib/streaks.ts` |
| Slug generation | `src/lib/slug.ts` |
| Name validation | `src/lib/validators.ts` |
| PWA manifest | `public/manifest.json` |
| Service worker | `public/sw.js` |
