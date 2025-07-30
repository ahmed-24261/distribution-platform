import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getUploadsWithAllWhere = async (where) => {
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
    WITH latest_process AS (
      SELECT DISTINCT ON (p.upload_id) p.*, usr.username
      FROM processes p
      LEFT JOIN users usr ON p.user_id = usr.id
      ORDER BY p.upload_id, p.started_at DESC
    )

    SELECT
      uploads.id,
      uploads.uploaded_at,
      uploads.type,
      uploads.file_name,
      users.username,

      -- Last process
      CASE
        WHEN lp.id IS NOT NULL THEN jsonb_build_object(
          'id', lp.id,
          'username', lp.username,
          'started_at', lp.started_at,
          'ended_at', lp.ended_at,
          'status', lp.status,
          'attempt', lp.attempt,
          'remark', lp.remark
        )
        ELSE '{}'::jsonb
      END AS process,

      -- Fiches of process
      (
        SELECT COALESCE(JSON_AGG(
          jsonb_build_object(
            'id', f.id,
            'ref', f.ref,
            'object', f.object,
            'source', s.name
          )
          ORDER BY f.ref
        ), '[]')
        FROM fiches f
        LEFT JOIN sources s ON f.source_id = s.id
        WHERE f.upload_id = uploads.id
      ) AS fiches,

      -- Failed fiches of process
      (
        SELECT COALESCE(JSON_AGG(
          jsonb_build_object(
            'id', ff.id,
            'file_name', ff.file_name,
            'file_path', ff.file_path,
            'message', ff.message
          )
          ORDER BY ff.id
        ), '[]')
        FROM failed_fiches ff
        WHERE ff.upload_id = uploads.id
      ) AS "failedFiches"

    FROM uploads
    LEFT JOIN users ON uploads.user_id = users.id
    LEFT JOIN latest_process lp ON lp.upload_id = uploads.id
    ${whereClause}
    ORDER BY uploads.uploaded_at DESC;
  `;

  const { rows } = await pool.query(query, values);

  return rows;
};

export const getUploadByIdWithProcess = async (id) => {
  const query = `
    WITH latest_process AS (
      SELECT DISTINCT ON (p.upload_id) p.*, usr.username
      FROM processes p
      LEFT JOIN users usr ON p.user_id = usr.id
      ORDER BY p.upload_id, p.started_at DESC
    )

    SELECT
      uploads.id,
      uploads.uploaded_at,
      uploads.type,
      uploads.file_name,
      users.username,

      -- Last process
      CASE
        WHEN lp.id IS NOT NULL THEN jsonb_build_object(
          'id', lp.id,
          'username', lp.username,
          'started_at', lp.started_at,
          'ended_at', lp.ended_at,
          'status', lp.status,
          'attempt', lp.attempt,
          'remark', lp.remark
        )
        ELSE '{}'::jsonb
      END AS process

    FROM uploads
    LEFT JOIN users ON uploads.user_id = users.id
    LEFT JOIN latest_process lp ON lp.upload_id = uploads.id
    WHERE uploads.id = $1
    ORDER BY uploads.uploaded_at DESC;
  `;

  const values = [id];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

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
    SELECT * 
    FROM uploads
    ${whereClause};
  `;

  const { rows } = await pool.query(query, values);

  return rows;
};

export const getUploadById = async (id) => {
  const query = `
    SELECT * 
    FROM uploads
    WHERE id = $1;
  `;

  const values = [id];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

export const getUploadByFileHash = async (file_hash) => {
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

export const deleteUploadWhere = async (where) => {
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
        WITH deleted_upload AS (
          DELETE FROM uploads
          WHERE id IN (
            SELECT uploads.id
            FROM uploads
            ${whereClause}
          )
          RETURNING *
        ),
        latest_process AS (
          SELECT DISTINCT ON (p.upload_id) p.*
          FROM processes p
          WHERE p.upload_id IN (SELECT id FROM deleted_upload)
          ORDER BY p.upload_id, p.started_at DESC
        )

        SELECT
          du.id,
          du.file_path,

          -- Fiche file paths related to last process
--          COALESCE(
--            ARRAY_AGG(DISTINCT f.file_path)
--            FILTER (WHERE f.id IS NOT NULL),
--            '{}'
--          ) AS "fichePaths",

          -- Failed fiche file paths related to last process
          COALESCE(
            ARRAY_AGG(DISTINCT ff.file_path)
            FILTER (WHERE ff.id IS NOT NULL),
            '{}'
          ) AS "failedFichePaths"

        FROM deleted_upload du
        LEFT JOIN latest_process lp ON lp.upload_id = du.id
        LEFT JOIN fiches f ON f.process_id = lp.id
        LEFT JOIN failed_fiches ff ON ff.process_id = lp.id
        GROUP BY du.id, du.file_path;
  `;

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return null;

    const { id, file_path, fichePaths = [], failedFichePaths = [] } = rows[0];

    await unlinkFile(file_path);

    for (const filePath of fichePaths) {
      const productPath = path.dirname(filePath);
      await rmDirectory(productPath);
    }

    for (const filePath of failedFichePaths) {
      await unlinkFile(filePath);
    }

    await client.query("COMMIT");
    client.release();

    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }
};

const unlinkFile = async (filePath) => {
  const absPath = path.join(FILE_STORAGE_PATH, filePath);
  const absDirPath = path.dirname(absPath);

  await fs.rm(absPath);
  await fs.rmdir(absDirPath).catch(() => null);
};

const rmDirectory = async (dirPath) => {
  const absDirPath = path.join(FILE_STORAGE_PATH, dirPath);
  const absDirDirPath = path.dirname(absDirPath);

  await fs.rm(absDirPath, { recursive: true });
  await fs.rmdir(absDirDirPath).catch(() => null);
};

export const buildUploadBuffer = async (upload) => {
  try {
    const absPath = path.join(FILE_STORAGE_PATH, upload.file_path);

    const fileBuffer = await fs.readFile(absPath);

    return fileBuffer;
  } catch {
    return null;
  }
};
