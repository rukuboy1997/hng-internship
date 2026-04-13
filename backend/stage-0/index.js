import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Route
app.get("/api/classify", async (req, res) => {
  try {
    const { name } = req.query;

    // 400: Missing or empty
    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Name parameter is required",
      });
    }

    // 422: Not a string
    if (typeof name !== "string") {
      return res.status(422).json({
        status: "error",
        message: "Name must be a string",
      });
    }

    // Call API
    const response = await axios.get(
      `https://api.genderize.io?name=${encodeURIComponent(name)}`
    );

    const { gender, probability, count } = response.data;

    // Edge case
    if (gender === null || count === 0) {
      return res.status(422).json({
        status: "error",
        message: "No prediction available for the provided name",
      });
    }

    const is_confident =
      probability >= 0.7 && count >= 100;

    return res.json({
      status: "success",
      data: {
        name,
        gender,
        probability,
        sample_size: count,
        is_confident,
        processed_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(502).json({
      status: "error",
      message: "Failed to fetch data from external API",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
