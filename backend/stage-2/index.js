const express = require("express");
const cookieParser = require("cookie-parser");
const profilesRouter = require("./routes/profiles");
const authRouter = require("./routes/auth");
const v2ProfilesRouter = require("./routes/v2/profiles");
const authenticate = require("./middleware/authenticate");
const csrf = require("./middleware/csrf");
const requestLogger = require("./middleware/requestLogger");
const { publicLimiter, authenticatedLimiter } = require("./middleware/rateLimiter");
const { ensureMigrated } = require("./migrations");

const app = express();

// Run DB migrations on startup (idempotent)
ensureMigrated().catch((err) => console.error("Migration error:", err.message));

// CORS — allow portal with credentials, all others get wildcard
const PORTAL_ORIGINS = [
  process.env.PORTAL_URL,
  "http://localhost:3001",
  "http://localhost:5173",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && PORTAL_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (after auth middleware on v2 routes so user_id is captured)
app.use(requestLogger);

// Rate limiting
app.use("/api/v2", publicLimiter);

// v1 routes — public (Stage 2 preserved)
app.use("/api/profiles", profilesRouter);

// Auth routes
app.use("/api/v2/auth", authRouter);

// v2 profile routes — require authentication
app.use(
  "/api/v2/profiles",
  authenticate,
  authenticatedLimiter,
  csrf,
  v2ProfilesRouter
);

// Health check
app.get("/api/healthz", (req, res) => res.json({ status: "ok", version: "2.0.0" }));
app.get("/api/v2/healthz", (req, res) => res.json({ status: "ok", version: "2.0.0" }));

app.use((req, res) => res.status(404).json({ status: "error", message: "Not found" }));
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ status: "error", message: "Server error" });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
