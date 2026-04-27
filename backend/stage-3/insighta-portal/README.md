# Insighta Labs+ Web Portal

A browser-based interface for the Insighta Labs+ demographic profile intelligence system.

## Setup

1. Edit `public/app.js` and set `BACKEND` to your deployed backend URL.
2. Deploy to Vercel — it's a pure static site (no server needed).

## Features

- GitHub OAuth login (via the backend, HTTP-only cookie session)
- CSRF protection (token embedded in JWT, sent as `X-CSRF-Token` header)
- Profile browser with filters: gender, age group, country, min/max age, sort
- Natural language search
- CSV export
- Role badge display (admin / analyst)
- Auto-refresh of expired access tokens

## Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the insighta-portal directory
vercel --prod
```

Vercel will serve the `public/` directory as a static site.

## Environment

Set `PORTAL_URL` on your **backend** Vercel deployment to the portal's deployed URL.
This is required for CORS credentialed requests to work.
