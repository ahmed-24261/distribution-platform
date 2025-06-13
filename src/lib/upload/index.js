import pool from "@/lib/db";
import * as pathLib from "path";
import fs from "fs/promises";
import { HTTPError } from "@/lib/utils";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

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

export const getUploadsByIdWithUserAndFiches = async (ids) => {
  try {
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
        ) AS fiches
      FROM upload u
      LEFT JOIN "user" us ON u.user_id = us.id
      LEFT JOIN fiche f ON f.upload_id = u.id
      LEFT JOIN source s ON f.source_id = s.id
      WHERE u.id = ANY($1::uuid[])
      GROUP BY u.id, us.username
      ORDER BY u.date DESC
    `;
    const values = [ids];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by id");
  }
};

export const getUploadsByIdAndUserId = async (ids, userId) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    WHERE id = ANY($1::uuid[]) AND user_id = $2
    ORDER BY date DESC
  `;
    const values = [ids, userId];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by id and userId");
  }
};

export const getUploadsByIdAndUserIdWithUserAndFiches = async (ids, userId) => {
  try {
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
        ) AS fiches
      FROM upload u
      LEFT JOIN "user" us ON u.user_id = us.id
      LEFT JOIN fiche f ON f.upload_id = u.id
      LEFT JOIN source s ON f.source_id = s.id
      WHERE u.id = ANY($1::uuid[]) AND u.user_id = $2
      GROUP BY u.id, us.username
      ORDER BY u.date DESC
  `;
    const values = [ids, userId];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by id and userId");
  }
};

export const getAllUploadsWithUserAndFiches = async () => {
  try {
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
        ) AS fiches
      FROM upload u
      LEFT JOIN "user" us ON u.user_id = us.id
      LEFT JOIN fiche f ON f.upload_id = u.id
      LEFT JOIN source s ON f.source_id = s.id
      GROUP BY u.id, us.username
      ORDER BY u.date DESC
  `;

    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch all uploads");
  }
};

export const getUploadsByUserIdWithUserAndFiches = async (userId) => {
  try {
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
        ) AS fiches
      FROM upload u
      LEFT JOIN "user" us ON u.user_id = us.id
      LEFT JOIN fiche f ON f.upload_id = u.id
      LEFT JOIN source s ON f.source_id = s.id
      WHERE u.user_id = $1
      GROUP BY u.id, us.username
      ORDER BY u.date DESC
  `;
    const values = [userId];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by userId");
  }
};

export const countUploadsWhereDisplayNameLike = async (like) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    WHERE display_name LIKE $1
  `;
    const values = [`${like}%`];

    const { rowCount } = await pool.query(query, values);
    return rowCount;
  } catch (error) {
    throw new Error("Failed to count uploads by displayName like");
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
  const path = recordData.path;
  const absPath = pathLib.join(FILE_STORAGE_PATH, path);
  const absDirPath = pathLib.dirname(absPath);
  await fs.mkdir(absDirPath, { recursive: true });
  await fs.writeFile(absPath, fileData);
};

export const deleteUploadTransaction = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      DELETE FROM upload
      WHERE id = $1
      RETURNING id, path`;

    const values = [id];

    const { rows } = await client.query(query, values);

    if (rows.length === 0) throw new HTTPError("Record not found", 404);

    await unlinkFile(rows[0].path);

    await client.query("COMMIT");
    client.release();

    return rows[0] ? rows[0].id : null;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw error;
  }
};

const unlinkFile = async (path) => {
  const absPath = pathLib.join(FILE_STORAGE_PATH, path);
  const absDirPath = pathLib.dirname(absPath);
  await fs.access(absPath).catch(() => {
    throw new HTTPError("File not found", 404);
  });
  await fs.unlink(absPath);
  await fs.rmdir(absDirPath).catch(() => {});
};
