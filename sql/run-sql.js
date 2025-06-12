import fs from "fs";
import { Pool } from "pg";
import dotenv from "dotenv";
import { consoleLog } from "../consoleLog/index.js";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runSQLFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, "utf-8");
    await pool.query(sql);
    consoleLog("SQL file executed successfully", "green");
  } catch (error) {
    consoleLog(error.message, "red");
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runSQLFile("sql/schema.sql");
