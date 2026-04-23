const express = require("express");
const cors = require("cors");
const profilesRouter = require("./routes/profiles");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/profiles", profilesRouter);

app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Not found" });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ status: "error", message: "Server error" });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
