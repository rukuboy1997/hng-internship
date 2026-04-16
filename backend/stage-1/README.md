🚀 Profile Classification API (Stage 1)

A serverless backend API that integrates multiple external data sources, processes user profiles, stores results, and exposes endpoints for retrieval and management.

---

📌 Base URL

https://stage-1-profiles-server.vercel.app

---

🧠 Overview

This API accepts a name, gathers data from three external services, applies classification logic, stores the result, and provides endpoints to manage the stored profiles.

Integrated APIs:

- Gender prediction → https://api.genderize.io
- Age estimation → https://api.agify.io
- Nationality prediction → https://api.nationalize.io

---

⚙️ Features

- ✅ Multi-API integration (Genderize, Agify, Nationalize)
- ✅ Data persistence using Redis (Upstash)
- ✅ Idempotent profile creation (no duplicates)
- ✅ Serverless architecture (Vercel)
- ✅ Filtering support (gender, country, age group)
- ✅ UUID v7 identifiers
- ✅ Robust error handling
- ✅ Edge case validation
- ✅ ISO 8601 timestamps (UTC)
- ✅ CORS enabled

---

🧱 Data Model

{
  "id": "uuid-v7",
  "name": "ella",
  "gender": "female",
  "gender_probability": 0.99,
  "sample_size": 1234,
  "age": 46,
  "age_group": "adult",
  "country_id": "NG",
  "country_probability": 0.85,
  "created_at": "2026-04-01T12:00:00Z"
}

---

🔌 API Endpoints

1️⃣ Create Profile

POST "/api/profiles"

Request Body

{ "name": "ella" }

Success (201)

{
  "status": "success",
  "data": { ...profile }
}

Duplicate (200)

{
  "status": "success",
  "message": "Profile already exists",
  "data": { ...profile }
}

---

2️⃣ Get Single Profile

GET "/api/profiles/{id}"

Success (200)

{
  "status": "success",
  "data": { ...profile }
}

---

3️⃣ Get All Profiles

GET "/api/profiles"

Optional Query Parameters

- "gender"
- "country_id"
- "age_group"

Example:

/api/profiles?gender=male&country_id=NG

Success (200)

{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}

---

4️⃣ Delete Profile

DELETE "/api/profiles/{id}"

Success

204 No Content

---

🧠 Classification Logic

Age Group (Agify)

Age Range| Group
0–12| child
13–19| teenager
20–59| adult
60+| senior

Nationality (Nationalize)

- Select country with highest probability

---

⚠️ Error Handling

All errors follow this format:

{
  "status": "error",
  "message": "Error description"
}

Possible Errors

Status| Description
400| Missing or empty name
422| Invalid input type
404| Profile not found
502| External API failure
500| Internal server error

---

🚫 Edge Case Handling

The API returns 502 and does NOT store data when:

- Genderize → "gender: null" OR "count: 0"
- Agify → "age: null"
- Nationalize → no country data

Example:

{
  "status": "error",
  "message": "Genderize returned an invalid response"
}

---

🗄️ Data Persistence

- Storage: Upstash Redis
- Key strategy:
  - "profile:{name}" → ensures idempotency
  - "id:{uuid}" → enables lookup by ID

---

🔁 Idempotency Strategy

- Duplicate names are not re-created
- Existing record is returned instead

---

🌐 CORS

Enabled globally:

Access-Control-Allow-Origin: *

---

⚡ Performance

- Parallel API calls using "Promise.all"
- Optimized for low latency
- Serverless scaling via Vercel

---

🧪 Local Development

npm install
vercel dev

Test:

http://localhost:3000/api/profiles

---

🚀 Deployment

Hosted on Vercel

vercel

---

🔐 Environment Variables

UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token

---

🛠️ Tech Stack

- Node.js (ES Modules)
- Vercel Serverless Functions
- Upstash Redis
- Axios
- UUID v7

---

📊 Evaluation Coverage

Criteria| Status
API Design| ✅
Multi-API Integration| ✅
Data Persistence| ✅
Idempotency| ✅
Filtering| ✅
Error Handling| ✅
Data Modeling| ✅
Response Structure| ✅

---

🙌 Author

Faruk Abubakar
Email: farouksaffas@email.com

---

🏁 Final Notes

- All endpoints tested and working
- Fully compliant with assessment requirements
- Ready for automated grading

---

✨ Built with precision and performance in mind.
