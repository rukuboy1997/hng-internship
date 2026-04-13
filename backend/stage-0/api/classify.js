const axios = require("axios");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");

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

    // Call Genderize API
    const response = await axios.get(
      `https://api.genderize.io?name=${encodeURIComponent(name)}`
    );

    const { gender, probability, count } = response.data;

    // Edge case: No prediction
    if (gender === null || count === 0) {
      return res.status(422).json({
        status: "error",
        message: "No prediction available for the provided name",
      });
    }

    // Confidence logic
    const is_confident =
      probability >= 0.7 && count >= 100;

    return res.status(200).json({
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
};
