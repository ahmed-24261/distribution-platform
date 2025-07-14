import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getFailedFicheById = async (id) => {
  const query = `
      SELECT failed_fiches.*, uploads.user_id
      FROM failed_fiches
      LEFT JOIN uploads ON failed_fiches.upload_id = uploads.id
      WHERE failed_fiches.id = $1
    `;

  const { rows, rowCount } = await pool.query(query, [id]);

  if (!rowCount) return null;

  return rows[0];
};

export const deleteFailedFicheById = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
        DELETE FROM failed_fiches 
        WHERE id = $1 
        RETURNING  file_path;
        `;
    const values = [id];

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const { file_path: fichePath } = rows[0];

    const absPath = path.join(FILE_STORAGE_PATH, fichePath);
    const absDirPath = path.dirname(absPath);
    const absDirDirPath = path.dirname(absDirPath);
    await fs.rm(absDirPath, { recursive: true });
    await fs.rmdir(absDirDirPath).catch(() => null);

    await client.query("COMMIT");
    client.release();

    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }
};
