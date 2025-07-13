import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getFichesWhere = async (where) => {
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
      SELECT 
        fiches.id,
        fiches.ref,
        sources.name AS source,
        fiches.date,
        fiches.object,
        fiches.summary,
        fiches.created_by AS "createdBy",
        fiches.dump,
        fiches.status,
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', d.id,
                'type', d.type,
                'fileName', d.file_name
              )
              ORDER BY d.file_name
            ),
            '[]'
          )
          FROM documents d
          LEFT JOIN fiches f ON d.fiche_id = f.id
          WHERE f.id = fiches.id
        ) AS documents,
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', f1.id,
                'ref', f1.ref,
                'object', f1.object,
                'summary', f1.summary,
                'createdBy', f1.created_by,
                'status', f1.status,
                'date', f1.date,
                'status', f1.status
              )
              ORDER BY f1.id
            ),
            '[]'
          )
          FROM fiches f1
          LEFT JOIN observations o ON o.observation_id = f1.id
          LEFT JOIN fiches f2 ON o.fiche_id = f2.id
          WHERE f2.id = fiches.id ${
            where.fiches.status ? "AND f1.status = 'valid'" : ""
          }
        ) AS observations

      FROM fiches
      JOIN groups_sources gs ON fiches.source_id = gs.source_id
      JOIN users ON gs.group_id = users.group_id
      JOIN sources ON sources.id = fiches.source_id
      JOIN documents ON documents.fiche_id = fiches.id
      ${whereClause}
      GROUP BY fiches.id, sources.name
      ORDER BY fiches.date DESC;
    `;

  const { rows } = await pool.query(query, values);

  return rows;
};

export const getFiches = async (ids, isUser) => {
  const clauses = [];
  const values = [];

  values.push(ids);
  clauses.push(`f.id = ANY($${values.length})`);

  if (isUser) {
    values.push(isUser.userId);
    clauses.push(`us.id = $${values.length}`);
  }

  const whereQuery = clauses.length ? `Where ${clauses.join(" AND ")}` : "";

  const query = `
      SELECT f.*,
      (
        SELECT COALESCE(
          JSON_AGG( d.* ), '[]'
        )
        FROM document d
        LEFT JOIN fiche ON d.fiche_id = fiche.id
        WHERE fiche.id = f.id
      ) AS documents
      FROM fiche f
      JOIN group_source gs ON f.source_id = gs.source_id
      JOIN "user" us ON gs.group_id = us.group_id
      JOIN source s ON s.id = f.source_id
      JOIN document d ON d.fiche_id = f.id
      ${whereQuery} ${isUser ? "AND f.status = 'valid'" : ""}
      GROUP BY f.id, s.name
      ORDER BY f.date DESC;
    `;

  const { rows } = await pool.query(query, values);

  return rows;
};

export const getOwnerFicheById = async (id) => {
  const query = `
        SELECT up.user_id AS "ownerId"
        FROM fiche f
        JOIN upload up ON f.upload_id = up.id
        WHERE f.id = $1;
        `;
  const values = [id];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  const { ownerId } = rows[0];

  return ownerId;
};

export const updateFiche = async (id, update) => {
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
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    return error;
  }
};
