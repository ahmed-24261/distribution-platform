import pool from "@/lib/db";
import * as pathLib from "path";
import fs from "fs/promises";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

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
    throw new Error("Failed to fetch uploads By id");
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
    throw new Error("Failed to fetch uploads By id and userId");
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
    throw new Error("Failed to fetch uploads By userId");
  }
};

export const getUploadsWhereDisplayNameLike = async (displayName) => {
  try {
    const query = `
    SELECT id, display_name, date, type, status, file_name, path, hash
    FROM upload
    WHERE display_name LIKE $1
  `;
    const values = [`${displayName}%`];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by displayName like");
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

    const upload = rows.length === 0 ? null : rows[0];

    return upload;
  } catch (error) {
    throw new Error("Failed to fetch upload by hash");
  }
};

export const createUploadTransaction = async (data, fileData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `INSERT INTO upload
    (user_id, display_name, date, type, file_name, path, hash)
    values
    ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`;
    const { userId, displayName, date, type, fileName, path, hash } = data;
    const values = [userId, displayName, date, type, fileName, path, hash];

    const { rows } = await client.query(query, values);

    await saveFile(data, fileData);

    await client.query("COMMIT");
    client.release();

    return rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    throw new Error("Failed to create upload (Transaction)");
  }
};

const saveFile = async (data, fileData) => {
  const path = data.path;
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

    await unlinkFile(rows[0].path);

    await client.query("COMMIT");
    client.release();

    return rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
  }
};

const unlinkFile = async (path) => {
  const absPath = pathLib.join(FILE_STORAGE_PATH, path);
  const absDirPath = pathLib.dirname(absPath);
  await fs.unlink(absPath);
  await fs.rmdir(absDirPath).catch(() => {});
};
