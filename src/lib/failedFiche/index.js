import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getFailedFicheOwnerId = async (id) => {
  try {
    const query = `
        SELECT u.user_id as "ownerId"
        FROM failed_fiche f
        JOIN upload u ON f.upload_id = u.id
        WHERE f.id = $1;
        `;
    const values = [id];

    const { rows, rowCount } = await pool.query(query, values);

    if (!rowCount) return null;

    const { ownerId } = rows[0];
    return ownerId;
  } catch {
    return null;
  }
};

export const updateFicheById = async (id, update) => {
  try {
    const keys = Object.keys(update);
    if (keys.length === 0) return false;

    const setClauses = keys.map((key, index) => `"${key}" = $${index + 1}`);

    const query = `
        UPDATE fiche
        SET ${setClauses.join(", ")}
        WHERE id = $${keys.length + 1}
        RETURNING id;
        `;
    const values = keys.map((key) => update[key]);

    const { rowCount } = await pool.query(query, [...values, id]);

    if (!rowCount) return null;

    return id;
  } catch (error) {
    return null;
  }
};

export const deleteFicheById = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
        DELETE FROM fiche 
        WHERE id = $1 
        RETURNING path as "fichePath";
        `;
    const values = [id];

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const { fichePath } = rows[0];

    const absPath = path.join(FILE_STORAGE_PATH, fichePath);
    const absDirPath = path.dirname(absPath);
    const absDirDirPath = path.dirname(absDirPath);
    await fs.rm(absDirPath, { recursive: true });
    await fs.rmdir(absDirDirPath).catch(() => null);

    await client.query("COMMIT");
    client.release();
    return id;
  } catch {
    await client.query("ROLLBACK");
    client.release();
    return null;
  }
};
