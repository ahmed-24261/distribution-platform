import pool from "@/lib/db";
import path from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export const getUploadsWhere = async (where = {}) => {
  const clauses = [];
  const values = [];

  Object.entries(where).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      values.push(value);
      clauses.push(`up.${field} = ANY($${values.length})`);
    } else {
      values.push(value);
      clauses.push(`up.${field} = $${values.length}`);
    }
  });

  const whereQuery = clauses.length ? "WHERE " + clauses.join(" AND ") : "";

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
                'status', f.status,
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
                'date', ff.date,
              )
              ORDER BY ff.id
            ),
            '[]'
          )
          FROM failed_fiche ff
          LEFT JOIN source s ON ff.source_id = s.id
          WHERE ff.upload_id = u.id
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

export const getUploadPathsAndFileNamesWhere = async (where = {}) => {
  const clauses = [];
  const values = [];

  Object.entries(where).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      values.push(value);
      clauses.push(`up.${field} = ANY($${values.length})`);
    } else {
      values.push(value);
      clauses.push(`up.${field} = $${values.length}`);
    }
  });

  const whereQuery = clauses.length ? "WHERE " + clauses.join(" AND ") : "";

  const query = `
      SELECT up.path
      FROM upload up
      ${whereQuery}
    `;

  const { rows } = await pool.query(query, values);
  const uploadPaths = rows.map((u) => u.path);
  return uploadPaths;
};

export const getUploadById = async (id) => {
  try {
    const query = `
    SELECT * 
    FROM upload
    WHERE id = $1;`;
    const values = [id];

    const { rows, rowCount } = await pool.query(query, values);

    if (!rowCount) return { not_found: true };
    return { ok: true, data: rows[0] };
  } catch {
    return { error: true };
  }
};

export const countUploadsWhereDisplayNameLike = async (displayName) => {
  try {
    const query = `
    SELECT id, "displayName", date, type, status, "fileName", path, hash
    FROM upload
    WHERE "displayName" LIKE $1
  `;
    const values = [`${displayName}%`];

    const { rowCount } = await pool.query(query, values);
    return { ok: true, data: rowCount };
  } catch {
    return { error: true };
  }
};

export const getUploadByHash = async (hash) => {
  try {
    const query = `
    SELECT id, "displayName", date, type, status, "fileName", path, hash
    FROM upload
    WHERE hash = $1
  `;
    const values = [hash];

    const { rows, rowCount } = await pool.query(query, values);

    if (!rowCount) return { not_found: true };

    return { ok: true, data: rows[0] };
  } catch {
    return { error: true };
  }
};

export const createUpload = async (uploadData, fileData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO upload
      ("userId", "displayName", date, type, "fileName", path, hash)
      values
      ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`;

    const {
      userId,
      displayName,
      date,
      type,
      fileName,
      path: filePath,
      hash,
    } = uploadData;
    const values = [userId, displayName, date, type, fileName, filePath, hash];

    const { rows, rowCount } = await client.query(query, values);

    if (!rowCount) return { error: true };

    const absPath = path.join(FILE_STORAGE_PATH, filePath);
    const absDirPath = path.dirname(absPath);
    await fs.mkdir(absDirPath, { recursive: true });
    await fs.writeFile(absPath, fileData);

    await client.query("COMMIT");
    client.release();

    return { ok: true, data: rows[0].id };
  } catch {
    await client.query("ROLLBACK");
    client.release();
    return { error: true };
  }
};

export const getUploadOwnerId = async (id) => {
  try {
    const query = `
        SELECT "userId" as "ownerId"
        FROM upload
        WHERE id = $1;
        `;
    const values = [id];

    const { rows, rowCount } = await pool.query(query, values);

    if (!rowCount) return { not_found: true };

    const { ownerId } = rows[0];
    return { ok: true, data: ownerId };
  } catch {
    return { error: true };
  }
};

export const deleteUpload = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
          WITH "deletedUpload" AS (
              DELETE FROM upload
              WHERE id = $1
              RETURNING id, path
          )
          SELECT
              du.id AS uploadId,
              du.path AS "uPath",
              COALESCE(ARRAY_AGG(DISTINCT f.path) FILTER (WHERE f.id IS NOT NULL), '{}') AS "fichePaths",
              COALESCE(ARRAY_AGG(DISTINCT ff.path) FILTER (WHERE ff.id IS NOT NULL), '{}') AS "failedFichePaths"
          FROM
              "deletedUpload" du
              LEFT JOIN fiche f ON f."uploadId" = du.id
              LEFT JOIN "failedFiche" ff ON ff."uploadId" = du.id
          GROUP BY
              du.id, du.path;
      `;
    const values = [id];

    const { rows } = await client.query(query, values);

    if (rows.length === 0) return { not_found: true };

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

    return { ok: true, data: uploadId };
  } catch {
    await client.query("ROLLBACK");
    client.release();
    return { error: true };
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
