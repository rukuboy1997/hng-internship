import axios from "axios";
import { redis } from "../../lib/redis.js";
import { v7 as uuidv7 } from "uuid";
import { getAgeGroup, getTopCountry } from "../../lib/utils.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (req.method === "POST") {
      const { name } = req.body;

      // Validation
      if (!name || name.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Name parameter is required",
        });
      }

      if (typeof name !== "string") {
        return res.status(422).json({
          status: "error",
          message: "Name must be a string",
        });
      }

      const key = `profile:${name.toLowerCase()}`;

      // Idempotency check
      const existing = await redis.get(key);
      if (existing) {
        return res.status(200).json({
          status: "success",
          message: "Profile already exists",
          data: existing,
        });
      }

      // Call APIs
      const [gRes, aRes, nRes] = await Promise.all([
        axios.get(`https://api.genderize.io?name=${name}`),
        axios.get(`https://api.agify.io?name=${name}`),
        axios.get(`https://api.nationalize.io?name=${name}`),
      ]);

      const { gender, probability, count } = gRes.data;
      const { age } = aRes.data;
      const { country } = nRes.data;

      // Edge cases
      if (!gender || count === 0) {
        return res.status(502).json({
          status: "error",
          message: "Genderize returned an invalid response",
        });
      }

      if (age === null) {
        return res.status(502).json({
          status: "error",
          message: "Agify returned an invalid response",
        });
      }

      const topCountry = getTopCountry(country);
      if (!topCountry) {
        return res.status(502).json({
          status: "error",
          message: "Nationalize returned an invalid response",
        });
      }

      const profile = {
        id: uuidv7(),
        name,
        gender,
        gender_probability: probability,
        sample_size: count,
        age,
        age_group: getAgeGroup(age),
        country_id: topCountry.country_id,
        country_probability: topCountry.probability,
        created_at: new Date().toISOString(),
      };

      // Store
      await redis.set(key, profile);
      await redis.set(`id:${profile.id}`, profile);

      return res.status(201).json({
        status: "success",
        data: profile,
      });
    }

    // GET ALL
    if (req.method === "GET") {
      const { gender, country_id, age_group } = req.query;

      const keys = await redis.keys("profile:*");
      const profiles = await Promise.all(keys.map(k => redis.get(k)));

      let filtered = profiles;

      if (gender) {
        filtered = filtered.filter(
          p => p.gender.toLowerCase() === gender.toLowerCase()
        );
      }

      if (country_id) {
        filtered = filtered.filter(
          p => p.country_id.toLowerCase() === country_id.toLowerCase()
        );
      }

      if (age_group) {
        filtered = filtered.filter(
          p => p.age_group.toLowerCase() === age_group.toLowerCase()
        );
      }

      return res.status(200).json({
        status: "success",
        count: filtered.length,
        data: filtered.map(p => ({
          id: p.id,
          name: p.name,
          gender: p.gender,
          age: p.age,
          age_group: p.age_group,
          country_id: p.country_id,
        })),
      });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}
