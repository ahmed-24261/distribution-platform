import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getFailedFiches = async (ids, userId) => {
  const clauses = [];
  const values = [];

  if (ids.length) {
    values.push(ids);
    clauses.push(`ff.id = ANY($${values.length})`);
  }
  if (userId) {
    values.push(userId);
    clauses.push(`up.user_id = $${values.length}`);
  }

  const whereQuery = clauses.length ? `Where ${clauses.join(" AND ")}` : "";

  const query = `
      SELECT ff.*
      FROM failed_fiche ff
      LEFT JOIN upload up ON ff.upload_id = up.id
      ${whereQuery}
    `;

  const { rows } = await pool.query(query, values);
  return rows;
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
