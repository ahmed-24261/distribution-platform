import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getFicheWithDocsAndObsByIdAndUserId = async (id, userId) => {
  const query = `
      SELECT 
        f.id,
        f.ref,
        s.name AS source,
        f.date,
        f.object,
        f.summary,
        f."createdBy",
        f.dump,
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', d.id,
                'type', d.type,
                'fileName', d."fileName",
              )
              ORDER BY d."fileName"
            ),
            '[]'
          )
          FROM document d
          LEFT JOIN fiche ON d."ficheId" = fiche.id
          WHERE fiche.id = f.id
        ) AS documents,
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', f1.id,
                'ref', f1.ref,
                'object', f1.object,
                'summary', f1.summary,
                'createdBy', f1."createdBy",
                'status', f1.status,
                'date', f1.date,
              )
              ORDER BY f1.id
            ),
            '[]'
          )
          FROM fiche f1
          LEFT JOIN observations o ON o.observation = f1.id
          LEFT JOIN fiche f2 ON o."ficheId" = f2.id
          WHERE f2.id = f.id
        ) AS observations

      FROM fiche f
      JOIN "groupSource" gs ON f."sourceId" = gs."sourceId"
      JOIN "user" u ON gs."groupId" = u."groupId"
      JOIN source s ON s.id = f."sourceId"
      JOIN document d ON d."ficheId" = f.id

      WHERE f.id = $1 AND f.status = 'valid' AND u.id = $2
      GROUP BY f.id, s.name
      ORDER BY f.date DESC;
    `;
  const values = [id, userId];

  const { rows } = await pool.query(query, values);

  return { ok: true, data: rows };
};

export const getFichePathById = async (id) => {
  const query = `SELECT path FROM fiche WHERE id = $1`;
  const values = [id];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  const { path } = rows[0];
  return path;
};

export const getFiche = async (id) => {
  try {
    const query = `
        SELECT f.*, u.*
        FROM fiche f
        JOIN upload u ON f."uploadId" = u.id
        WHERE f.id = $1;
        `;
    const values = [id];

    const { rows, rowCount } = await pool.query(query, values);

    if (!rowCount) return { not_found: true };

    return { ok: true, data: rows[0] };
  } catch {
    return { error: true };
  }
};

export const updateFiche = async (id, update) => {
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

    return { ok: true, data: id };
  } catch {
    return { error: true };
  }
};

export const deleteFiche = async (id) => {
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
    return { ok: true, data: id };
  } catch {
    await client.query("ROLLBACK");
    client.release();
    return { error: true };
  }
};
