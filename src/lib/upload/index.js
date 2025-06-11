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

export const getUploadsById = async (ids) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    WHERE id = ANY($1::uuid[])
    ORDER BY date DESC
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

export const getAllUploads = async () => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    ORDER BY date DESC
  `;

    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch all uploads");
  }
};

export const getUploadsByUserId = async (userId) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    WHERE user_id = $1
    ORDER BY date DESC
  `;
    const values = [userId];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by userId");
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

export const updateUploadStatusById = async (id, status) => {
  try {
    const query = `
      UPDATE upload
      SET status = $1
      WHERE id = $2
      RETURNING id, display_name, date, type, status, file_name, path, hash; 
    `;
    const values = [status, id];

    const { rows } = await pool.query(query, values);

    return rows[0] ? rows[0] : null;
  } catch (error) {
    throw new Error("Failed update upload status by id");
  }
};
