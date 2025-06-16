import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";
import { HTTPError } from "@/lib/utils";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getUploadsWhere = async (where = {}) => {
  try {
    let whereQuery = "";
    const values = [];
    const clauses = [];

    Object.entries(where).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        values.push(value);
        clauses.push(`u.${key} = ANY($${values.length})`);
      } else {
        values.push(value);
        clauses.push(`u.${key} = $${values.length}`);
      }
    });

    if (clauses.length > 0) {
      whereQuery = "WHERE " + clauses.join(" AND ");
    }
    const query = `
      SELECT 
        u.id,
        u.display_name as "displayName",
        u.date,
        u.type,
        u.status,
        u.file_name as "fileName",
        u.path,
        u.hash,
        us.username,
        COALESCE(
          JSON_AGG(
            jsonb_build_object(
              'id', f.id,
              'ref', f.ref,
              'source', s.name,
              'date', f.date,
              'object', f.object,
              'summary', f.summary,
              'dateDistribute', f.date_distribute,
              'status', f.status,
              'path', f.path,
              'hash', f.hash,
              'dump', f.dump
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'
        ) AS fiches,
        COALESCE(
          JSON_AGG(
            jsonb_build_object(
              'id', ff.id,
              'source', s2.name,
              'date', ff.date,
              'path', ff.path,
              'hash', ff.hash
            )
          ) FILTER (WHERE ff.id IS NOT NULL),
          '[]'
        ) AS "failedFiches"
      FROM upload u
      LEFT JOIN "user" us ON u.user_id = us.id
      LEFT JOIN fiche f ON f.upload_id = u.id
      LEFT JOIN source s ON f.source_id = s.id
      LEFT JOIN failed_fiche ff ON ff.upload_id = u.id
      LEFT JOIN source s2 ON ff.source_id = s2.id
      ${whereQuery}
      GROUP BY u.id, us.username
      ORDER BY u.date DESC
  `;

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads");
  }
};

export const getUploadByIdWithUser = async (id) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash, user_id
    FROM upload
    WHERE id = $1
  `;
    const values = [id];

    const { rows } = await pool.query(query, values);
    return rows[0] ? rows[0] : null;
  } catch (error) {
    throw new Error("Failed to fetch upload by id");
  }
};

export const getUploadByHash = async (hash) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    WHERE hash = $1
  `;
    const values = [hash];

    const { rows } = await pool.query(query, values);

    return rows[0] ? rows[0] : null;
  } catch (error) {
    throw new Error("Failed to fetch upload by hash");
  }
};

export const countUploadsWhereDisplayNameLike = async (displayName) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    WHERE display_name LIKE $1
  `;
    const values = [`${displayName}%`];

    const { rowCount } = await pool.query(query, values);
    return rowCount;
  } catch (error) {
    throw new Error("Failed to count uploads by displayName like");
  }
};

export const createUploadTransaction = async (recordData, fileData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO upload
      (user_id, display_name, date, type, file_name, path, hash)
      values
      ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`;
    const { userId, displayName, date, type, fileName, path, hash } =
      recordData;
    const values = [userId, displayName, date, type, fileName, path, hash];

    const { rows } = await client.query(query, values);

    await saveFile(recordData, fileData);

    await client.query("COMMIT");
    client.release();

    return rows[0] ? rows[0].id : null;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw new Error("Failed to create upload (Transaction)");
  }
};

const saveFile = async (recordData, fileData) => {
  const filePath = recordData.path;
  const absPath = path.join(FILE_STORAGE_PATH, filePath);
  const absDirPath = path.dirname(absPath);
  await fs.mkdir(absDirPath, { recursive: true });
  await fs.writeFile(absPath, fileData);
};

export const deleteUploadTransaction = async (id, userId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const values = [id];
    const clauses = ["id = $1"];

    if (userId) {
      values.push(userId);
      clauses.push("user_id = $2");
    }

    const query = `
          WITH deleted_upload AS (
              DELETE FROM upload
              WHERE ${clauses.join(" AND ")}
              RETURNING id, path
          )
          SELECT
              du.id,
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

    const { rows } = await client.query(query, values);

    if (rows.length === 0) throw new HTTPError("Record not found", 404);

    const { uPath, fichePaths, failedFichePaths } = rows[0];

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

    return rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    return null;
  }
};

const unlinkFile = async (filePath) => {
  const absPath = path.join(FILE_STORAGE_PATH, filePath);
  const absDirPath = path.dirname(absPath);
  await fs.rm(absPath);
  await fs.rm(absDirPath, { force: true });
};

const rmDirectory = async (dirPath) => {
  const absDirPath = path.join(FILE_STORAGE_PATH, dirPath);
  const absDirDirPath = path.dirname(absDirPath);
  await fs.rm(absDirPath, { recursive: true });
  await fs.rm(absDirDirPath, { force: true });
};
