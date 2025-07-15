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

export const deleteFailedFicheWhere = async (where) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const values = [];
    const clauses = [];

    Object.entries(where).forEach(([table, attributes]) => {
      Object.entries(attributes).forEach(([attribute, value]) => {
        values.push(value);
        if (Array.isArray(value)) {
          clauses.push(`${table}.${attribute} = ANY($${values.length})`);
        } else {
          clauses.push(`${table}.${attribute} = $${values.length}`);
        }
      });
    });

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const query = `
        DELETE FROM failed_fiches
        WHERE id IN (
        SELECT failed_fiches.id FROM failed_fiches
        JOIN uploads ON uploads.id = failed_fiches.upload_id
         ${whereClause}
        ) 
        RETURNING id, file_path;
        `;

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const { id, file_path: fichePath } = rows[0];

    const absPath = path.join(FILE_STORAGE_PATH, fichePath);
    const absDirPath = path.dirname(absPath);
    await fs.rm(absPath);
    await fs.rmdir(absDirPath).catch(() => null);

    await client.query("COMMIT");

    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
