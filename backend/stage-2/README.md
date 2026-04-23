# Insighta Labs — Intelligence Query Engine

A demographic intelligence API built with Node.js + Express. Supports advanced filtering, sorting, pagination, and natural language search.

---

## Project Structure

```
├── index.js          # Express app entry point
├── db.js             # PostgreSQL connection pool
├── routes/
│   └── profiles.js   # All /api/profiles endpoints
├── scripts/
│   └── seed.js       # Database seed script
├── api/
│   └── index.js      # Vercel serverless entry point
├── vercel.json       # Vercel deployment config
├── .env.example      # Example environment variables
└── package.json
```

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Set up environment variables**

Copy `.env.example` to `.env` and fill in your database URL:
```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
PORT=3000
```

**3. Seed the database**
```bash
npm run seed
```

**4. Start the server**
```bash
npm start
# or for development with auto-reload:
npm run dev
```

---

## Deploying to Vercel

1. Push this folder to a GitHub repo
2. Import it on [vercel.com](https://vercel.com) (use the repo root as the project root)
3. Add the `DATABASE_URL` environment variable in Project Settings → Environment Variables
4. Deploy

> No special build step needed — Vercel detects `api/index.js` and runs it as a serverless function automatically.

---

## Endpoints

### `GET /api/profiles`

Filter, sort, and paginate profiles.

**Filters:**

| Parameter                 | Type   | Description                              |
|--------------------------|--------|------------------------------------------|
| `gender`                 | string | `male` or `female`                       |
| `age_group`              | string | `child`, `teenager`, `adult`, `senior`   |
| `country_id`             | string | ISO 2-letter code e.g. `NG`, `KE`        |
| `min_age`                | int    | Minimum age (inclusive)                  |
| `max_age`                | int    | Maximum age (inclusive)                  |
| `min_gender_probability` | float  | Minimum gender confidence score          |
| `min_country_probability`| float  | Minimum country confidence score         |

**Sorting:** `sort_by` = `age` | `created_at` | `gender_probability`, `order` = `asc` | `desc`

**Pagination:** `page` (default: 1), `limit` (default: 10, max: 50)

**Example:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

---

### `GET /api/profiles/search`

Natural language query — rule-based, no AI.

| Parameter | Description                        |
|----------|------------------------------------|
| `q`      | Query string (required)            |
| `page`   | Page number (default: 1)           |
| `limit`  | Results per page (default: 10, max: 50) |

**Example:**
```
GET /api/profiles/search?q=young males from nigeria
GET /api/profiles/search?q=adult females from kenya above 30
```

---

## Natural Language Parsing

Pure rule-based parsing — no AI or LLMs used.

**Supported keywords:**

| Keyword / Pattern                              | Filter applied                          |
|-----------------------------------------------|-----------------------------------------|
| `male`, `males`, `men`, `man`, `boys`         | `gender=male`                           |
| `female`, `females`, `women`, `woman`, `girls`| `gender=female`                         |
| `male and female`, `both`                     | no gender filter                        |
| `child`, `children`, `kids`                   | `age_group=child`                       |
| `teenager`, `teenagers`, `teen`               | `age_group=teenager`                    |
| `adult`, `adults`                             | `age_group=adult`                       |
| `senior`, `seniors`, `elderly`                | `age_group=senior`                      |
| `young`                                       | `min_age=16`, `max_age=24`              |
| `above 30`, `over 30`, `older than 30`        | `min_age=30`                            |
| `below 25`, `under 25`, `younger than 25`     | `max_age=25`                            |
| `between 20 and 35`                           | `min_age=20`, `max_age=35`              |
| `aged 40`                                     | `min_age=40`, `max_age=40`              |
| Country names (e.g. `nigeria`, `south africa`)| `country_id=NG`, `country_id=ZA`, etc. |

**Example mappings:**

| Query                                 | Result                                              |
|--------------------------------------|-----------------------------------------------------|
| `young males`                        | `gender=male`, `min_age=16`, `max_age=24`           |
| `females above 30`                   | `gender=female`, `min_age=30`                       |
| `people from angola`                 | `country_id=AO`                                     |
| `adult males from kenya`             | `gender=male`, `age_group=adult`, `country_id=KE`   |
| `male and female teenagers above 17` | `age_group=teenager`, `min_age=17`                  |

Unrecognized queries return:
```json
{ "status": "error", "message": "Unable to interpret query" }
```

---

## Limitations

- No synonym expansion — words like `youth`, `elders`, `infant` are not recognized
- No OR logic — all conditions are ANDed; can't query "Nigerians or Kenyans"
- Country ISO codes not accepted as input — use full names like `nigeria`, not `NG`
- No fuzzy matching — typos like `nigera` won't match
- No negation support — `not from kenya` is not handled
- Only English queries are supported
- `young` and `above X` can coexist — `above X` takes precedence for `min_age`

---

## Error Responses

```json
{ "status": "error", "message": "<description>" }
```

| Code | Meaning                              |
|------|--------------------------------------|
| 400  | Missing or empty required parameter  |
| 404  | Not found                            |
| 422  | Invalid parameter value or type      |
| 500  | Server error                         |
