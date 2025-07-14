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

export const getFicheWhere = async (where) => {
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
        sources.name,
        fiches.date,
        fiches.object,
        fiches.summary,
        fiches.created_by,
        fiches.file_path,
        fiches.dump,
        fiches.status,
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', d.id,
                'type', d.type,
                'file_name', d.file_name,
                'file_path', d.file_path
              )
              ORDER BY d.file_name
            ),
            '[]'
          )
          FROM documents d
          LEFT JOIN fiches f ON d.fiche_id = f.id
          WHERE f.id = fiches.id
        ) AS documents

      FROM fiches
      JOIN groups_sources gs ON fiches.source_id = gs.source_id
      JOIN users ON gs.group_id = users.group_id
      JOIN sources ON sources.id = fiches.source_id
      JOIN documents ON documents.fiche_id = fiches.id
      ${whereClause}
      GROUP BY fiches.id, sources.name
      ORDER BY fiches.date DESC;
    `;
  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

export const updateFicheWhere = async (where, update) => {
  const values = [];

  const setClauses = [];
  Object.entries(update).forEach(([attribute, value]) => {
    values.push(value);
    setClauses.push(`${attribute} = $${values.length}`);
  });

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
    UPDATE fiches
    SET ${setClauses.join(", ")}
    ${whereClause}
    RETURNING id;
    `;

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0].id;
};

export const deleteFicheWhere = async (where) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const values = [];

    Object.entries(where).forEach(([table, attributes]) => {
      Object.entries(attributes).forEach(([attribute, value]) => {
        values.push(value);
      });
    });

    const query = `
    DELETE FROM fiches
    WHERE id = $1
    ${
      where.uploads.user_id
        ? `AND upload_id IN (
        SELECT id FROM uploads WHERE user_id = $2
      )`
        : ""
    }
    RETURNING id, file_path;`;

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const { id, file_path: fichePath } = rows[0];

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
