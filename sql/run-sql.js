const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { consoleLog } = require("../consoleLog");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

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

runSQLFile(path.join(__dirname, "schema.sql"));
