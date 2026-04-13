# Gender Classification API

## Endpoint
GET /api/classify?name={name}

## Description
This API integrates with Genderize.io to classify a name's gender and return processed data.

## Features
- External API integration
- Confidence calculation
- Error handling
- Edge case handling
- CORS enabled

## Example Response

{
  "status": "success",
  "data": {
    "name": "john",
    "gender": "male",
    "probability": 0.99,
    "sample_size": 1234,
    "is_confident": true,
    "processed_at": "2026-04-01T12:00:00Z"
  }
}

## Tech Stack
- Node.js
- Axios
- Vercel Serverless Functions

## Deployment
Hosted on Vercel
