import { redis } from "../../lib/redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { id } = req.query;

  try {
    const profile = await redis.get(`id:${id}`);

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    if (req.method === "GET") {
      return res.status(200).json({
        status: "success",
        data: profile,
      });
    }

    if (req.method === "DELETE") {
      await redis.del(`id:${id}`);
      await redis.del(`profile:${profile.name.toLowerCase()}`);

      return res.status(204).end();
    }

  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}
