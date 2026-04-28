# insighta-cli

Globally installable CLI for Insighta Labs+ demographic profile intelligence.

## Install

```bash
npm install -g insighta-labs-cli
```

## Commands

```bash
insighta login                             # GitHub OAuth (opens browser, PKCE flow)
insighta whoami                            # Show current user info
insighta profiles                          # List all profiles (paginated)
insighta profiles --gender male            # Filter by gender
insighta profiles --country NG             # Filter by country code
insighta profiles --age-group adult        # Filter by age group
insighta profiles --min-age 25 --max-age 45
insighta profiles --sort-by age --order desc --page 2
insighta profiles --json                   # Raw JSON output
insighta search "young males from Nigeria" # Natural language search
insighta export                            # Export all profiles as CSV to stdout
insighta export --country NG --output nigeria.csv
insighta logout                            # Clear session
```

## Credentials

Stored at `~/.insighta/credentials.json` (mode 600):

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": { "id": "...", "username": "...", "role": "admin" },
  "backend_url": "https://hng-internship-ivory.vercel.app"
}
```

Access tokens are automatically refreshed when expired.

## Custom Backend

```bash
insighta login --backend https://your-backend.vercel.app
# or
INSIGHTA_BACKEND=https://your-backend.vercel.app insighta profiles
```
