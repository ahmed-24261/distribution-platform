import pool from "@/lib/db";

export const getUploadsById = async (ids) => {
  try {
    const query = `
    SELECT * FROM upload 
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
    SELECT * FROM upload 
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
    SELECT * FROM upload
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
    SELECT * FROM upload 
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

export const createUpload = async (data) => {
  try {
    const query = `INSERT INTO upload 
    (user_id, display_name, date, type, file_name, path, hash) 
    values 
    ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`;

    const { userId, displayName, date, type, fileName, path, hash } = data;
    const values = [userId, displayName, date, type, fileName, path, hash];

    const { rows } = await pool.query(query, values);
    return rows[0].id;
  } catch (error) {
    throw new Error("Failed to create upload" + error.message);
  }
};

export const getUploadsWhereDisplayNameLike = async (displayName) => {
  try {
    const query = `
    SELECT * FROM upload 
    WHERE display_name LIKE $1
  `;
    const values = [`${displayName}%`];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by displayName like");
  }
};

export const getUploadsWhereDisplayNameStartsWith = async (displayName) => {
  try {
    const query = `
    SELECT * FROM upload 
    WHERE display_name ILIKE $1
    ORDER BY date DESC
  `;
    const values = [`${displayName}%`];

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    throw new Error("Failed to fetch uploads by display name");
  }
};
