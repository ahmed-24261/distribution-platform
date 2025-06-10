import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });
redis.on("error", (err) => console.error("Redis error:", err));

await redis.connect();

console.log("🚀 Worker listening for record IDs...");

while (true) {
  try {
    const result = await redis.blPop("processQueue", 0);
    const id = result?.element;
    console.log(`🔧 Processing ID: ${id}`);

    await new Promise((res) => setTimeout(res, 5000));

    console.log(`✅ Done with ID: ${id}`);
  } catch (err) {
    console.error("Worker error:", err);
  }
}
