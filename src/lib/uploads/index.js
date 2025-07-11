import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getUploadsWhere = async (where) => {
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
        uploads.id,
        uploads.display_name AS "displayName",
        uploads.date,
        uploads.type,
        uploads.status,
        uploads.file_name AS "fileName",
        users.username AS "user",
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', f.id,
                'ref', f.ref,
                'source', s.name,
                'date', f.date,
                'dateDistribute', f.date_distribute,
                'status', f.status
              )
              ORDER BY f.ref
            ),
            '[]'
          )
          FROM fiches f
          LEFT JOIN sources s ON f.source_id = s.id
          WHERE f.upload_id = uploads.id
        ) AS fiches,
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', ff.id,
                'source', s.name,
                'date', ff.date
              )
              ORDER BY ff.id
            ),
            '[]'
          )
          FROM failed_fiches ff
          LEFT JOIN sources s ON ff.source_id = s.id
          WHERE ff.upload_id = uploads.id
        ) AS "failedFiches"

      FROM uploads
      LEFT JOIN users ON uploads.user_id = users.id
      ${whereClause}
      GROUP BY uploads.id, users.username
      ORDER BY uploads.date DESC;
    `;

  const { rows } = await pool.query(query, values);
  return rows;
};

export const countUploadsByDisplayName = async (displayName) => {
  const query = `
    SELECT id
    FROM uploads
    WHERE display_name LIKE $1
  `;
  const values = [`${displayName}%`];

  const { rowCount } = await pool.query(query, values);
  return rowCount;
};

export const getUploadByHash = async (file_hash) => {
  const query = `
    SELECT *
    FROM uploads
    WHERE file_hash = $1
  `;
  const values = [file_hash];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;
  return rows[0];
};

export const createUpload = async (data, buffer) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO uploads (${Object.keys(data).join(", ")}) 
      values (${Object.keys(data)
        .map((_, i) => `$${i + 1}`)
        .join(", ")}) 
      RETURNING *`;

    const values = Object.values(data);

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const absPath = path.join(FILE_STORAGE_PATH, data.file_path);
    const dirPath = path.dirname(absPath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(absPath, buffer);

    await client.query("COMMIT");
    client.release();

    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }
};

export const getUploadsForConsumption = async (ids, userId) => {
  const clauses = [];
  const values = [];

  if (ids.length) {
    values.push(ids);
    clauses.push(`up.id = ANY($${values.length})`);
  }
  if (userId) {
    values.push(userId);
    clauses.push(`up.user_id = $${values.length}`);
  }

  const whereQuery = clauses.length ? `Where ${clauses.join(" AND ")}` : "";

  const query = `
      SELECT 
        up.id,
        up.display_name AS "displayName",
        up.date,
        up.type,
        up.status,
        up.file_name AS "fileName",
        us.username AS "user",
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', f.id,
                'ref', f.ref,
                'source', s.name,
                'date', f.date,
                'dateDistribute', f.date_distribute,
                'status', f.status
              )
              ORDER BY f.ref
            ),
            '[]'
          )
          FROM fiche f
          LEFT JOIN source s ON f.source_id = s.id
          WHERE f.upload_id = up.id
        ) AS fiches,
        (
          SELECT COALESCE(
            JSON_AGG(
              jsonb_build_object(
                'id', ff.id,
                'source', s.name,
                'date', ff.date
              )
              ORDER BY ff.id
            ),
            '[]'
          )
          FROM failed_fiche ff
          LEFT JOIN source s ON ff.source_id = s.id
          WHERE ff.upload_id = up.id
        ) AS "failedFiches"

      FROM upload up
      LEFT JOIN "user" us ON up.user_id = us.id
      ${whereQuery}
      GROUP BY up.id, us.username
      ORDER BY up.date DESC;
    `;

  const { rows } = await pool.query(query, values);
  return rows;
};

export const getUploadById = async (id) => {
  const query = `
    SELECT *
    FROM uploads
    WHERE id = $1
  `;
  const values = [id];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;
  return rows[0];
};

export const getUploads = async (ids, userId) => {
  const clauses = [];
  const values = [];

  if (ids.length) {
    values.push(ids);
    clauses.push(`up.id = ANY($${values.length})`);
  }
  if (userId) {
    values.push(userId);
    clauses.push(`up.user_id = $${values.length}`);
  }

  const whereQuery = clauses.length ? `Where ${clauses.join(" AND ")}` : "";

  const query = `
      SELECT up.*
      FROM upload up
      ${whereQuery}
    `;

  const { rows } = await pool.query(query, values);
  return rows;
};

export const deleteUpload = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
          WITH deleted_upload AS (
              DELETE FROM upload
              WHERE id = $1
              RETURNING id, path
          )
          SELECT
              du.id AS "uploadId",
              du.path AS "uPath",
              COALESCE(ARRAY_AGG(DISTINCT f.path) FILTER (WHERE f.id IS NOT NULL), '{}') AS "fichePaths",
              COALESCE(ARRAY_AGG(DISTINCT ff.path) FILTER (WHERE ff.id IS NOT NULL), '{}') AS "failedFichePaths"
          FROM
              deleted_upload du
              LEFT JOIN fiche f ON f.upload_id = du.id
              LEFT JOIN failed_fiche ff ON ff.upload_id = du.id
          GROUP BY
              du.id, du.path;
      `;
    const values = [id];

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const { uploadId, uPath, fichePaths, failedFichePaths } = rows[0];

    await unlinkFile(uPath);

    for (const filePath of fichePaths) {
      const productPath = path.dirname(filePath);
      await rmDirectory(productPath);
    }

    for (const filePath of failedFichePaths) {
      await unlinkFile(filePath);
    }

    await client.query("COMMIT");
    client.release();

    return uploadId;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }
};

const unlinkFile = async (filePath) => {
  const absPath = path.join(FILE_STORAGE_PATH, filePath);
  const absDirPath = path.dirname(absPath);

  console.log(absPath);
  console.log(absDirPath);

  await fs.rm(absPath);
  await fs.rmdir(absDirPath).catch(() => null);
};

const rmDirectory = async (dirPath) => {
  const absDirPath = path.join(FILE_STORAGE_PATH, dirPath);
  const absDirDirPath = path.dirname(absDirPath);
  await fs.rm(absDirPath, { recursive: true });
  await fs.rmdir(absDirDirPath).catch(() => null);
};
