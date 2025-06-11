import { createClient } from "redis";
import pool from "./db.js";
import dotenv from "dotenv";
dotenv.config();

import StreamZip from "node-stream-zip";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import fs from "fs/promises";
import * as pathLib from "path";
import { pipeline } from "stream/promises";

import { consoleLog } from "../consoleLog/index.js";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;
const TEMP_FOLDER = process.env.TEMP_FOLDER;

const redis = createClient({ url: process.env.REDUS_URL });
redis.on("error", (err) => console.error("Redis error:", err));
consoleLog("🚀 Worker listening for record IDs...", "blue");

await redis.connect();

const processFile = async (id, path, outputDir) => {
  const tempFolder = pathLib.join(TEMP_FOLDER, id, "main");

  //handle products

  // handle zipFiles

  await unzipFile(absPath, tempFolder);

  const fileNames = await listFilesRecursive(tempFolder);

  fileNames.forEach((fileName) => {
    if (fileName.endsWith(".zip")) consoleLog("📄 " + fileName, "red");
    else consoleLog("📄 " + fileName, "yellow");
  });

  consoleLog("Processed is finish", "magenta");
};

const unzipFile = async (zipPath, outputDir) => {
  const zip = new StreamZip.async({ file: zipPath });

  try {
    // Create output directory if needed
    await mkdir(outputDir, { recursive: true });

    // Get all entries from the zip
    const entries = await zip.entries();
    const entryNames = Object.keys(entries);
    let extractedCount = 0;

    // Process files with controlled concurrency
    const concurrency = 5;
    for (let i = 0; i < entryNames.length; i += concurrency) {
      const batch = entryNames.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (entryName) => {
          const entry = entries[entryName];

          if (entry.isDirectory) {
            await mkdir(pathLib.join(outputDir, entry.name), {
              recursive: true,
            });
            return;
          }

          const fullPath = pathLib.join(outputDir, entry.name);
          const dir = pathLib.dirname(fullPath);

          // Ensure directory exists
          await mkdir(dir, { recursive: true });

          // Create streams
          const readStream = await zip.stream(entry.name);
          const writeStream = createWriteStream(fullPath);

          try {
            await pipeline(readStream, writeStream);
            extractedCount++;

            // Progress reporting
            if (
              extractedCount % 10 === 0 ||
              extractedCount === entryNames.length
            ) {
              console.log(
                `Progress: ${extractedCount}/${entryNames.length} files extracted`
              );
            }
          } catch (err) {
            console.error(`Failed to extract ${entry.name}:`, err);
            throw err;
          }
        })
      );
    }

    console.log(
      `✅ Successfully extracted ${extractedCount} files to ${outputDir}`
    );
  } catch (err) {
    console.error("❌ Unzipping failed:", err);
    throw err;
  } finally {
    await zip.close();
  }
};

async function listFilesRecursive(dir) {
  let fileNames = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = pathLib.join(dir, entry.name);

    if (entry.isDirectory()) {
      const recFileNames = await listFilesRecursive(fullPath);
      fileNames = [...fileNames, ...recFileNames];
    } else if (entry.isFile()) {
      fileNames.push(fullPath);
    }
  }
  return fileNames;
}

// DB
const getUploadById = async (id) => {
  try {
    const query = `
      SELECT *
      FROM upload
      WHERE id = $1`;
    const values = [id];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {}
};

const transaction = async () => {};

while (true) {
  try {
    const result = await redis.blPop("uploadsToProcess", 0);
    const id = result?.element;

    const upload = await getUploadById(id);

    consoleLog("upload: ", upload);
    consoleLog(
      Object.entries(upload).map((e) => `${e[0]}: ${e[1]}`),
      "yellow"
    );

    if (!upload) {
      consoleLog("Record not exist", "red");
      continue;
    }

    const { path } = upload;
    const absPath = pathLib.join(FILE_STORAGE_PATH, path);
    const outputDir = pathLib.join(TEMP_FOLDER, id, "main");

    await processFile(id, absPath, outputDir);

    consoleLog(`✅ Done with ID: ${id}`, "green");
  } catch (err) {
    console.error("Worker error:", err);
  }
}
