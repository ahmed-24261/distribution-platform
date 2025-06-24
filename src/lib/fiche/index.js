import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";
import { HTTPError } from "@/lib/utils";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getFicheWithUserId = async (id) => {
  const query = `
      SELECT 
        f.id, 
        f.ref, 
        f.date, 
        f.object, 
        f.summary, 
        f.created_by as "createdBy", 
        f.date_distribute as "dateDistribute", 
        f.status, 
        f.path, 
        f.hash, 
        f.dump,
        s.name as source,
        us.id as "userId"
      FROM 
        fiche f
      JOIN 
        upload u ON f.upload_id = u.id
      JOIN 
        "user" us ON u.user_id = us.id
      JOIN 
        source s ON f.source_id = s.id
      WHERE 
        f.id = $1
    `;

  const values = [id];
  const { rows } = await pool.query(query, values);

  return rows[0] || null;
};

export const deleteFicheTransaction = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
        DELETE FROM fiche 
        WHERE id = $1 
        RETURNING path;
        `;
    const values = [id];

    const { rows } = await client.query(query, values);

    if (rows.length === 0) {
      throw new HTTPError("Fiche introuvable", 404);
    }

    const { path: filePath } = rows[0];

    const dirPath = path.dirname(filePath);
    await rmDirectory(dirPath);

    await client.query("COMMIT");
    client.release();
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }
};

const rmDirectory = async (dirPath) => {
  const absDirPath = path.join(FILE_STORAGE_PATH, dirPath);
  const absDirDirPath = path.dirname(absDirPath);
  await fs.rm(absDirPath, { recursive: true });
  await fs.rmdir(absDirDirPath).catch(() => null);
};
