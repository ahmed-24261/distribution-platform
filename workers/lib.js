import { Pool } from "pg";
import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const redis = createClient({ url: process.env.REDUS_URL });
redis.on("error", (err) => console.error("Redis Client Error", err));
await redis.connect();
