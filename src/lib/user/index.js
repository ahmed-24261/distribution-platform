import pool from "@/lib/db";

export const getUserById = async (id) => {
  try {
    const query =
      'SELECT id, username, role, status, created_at,updated_at, created_by FROM "user" WHERE id = $1';
    const values = [id];

    const { rows } = await pool.query(query, values);

    const user = rows.length === 0 ? null : rows[0];

    return user;
  } catch (error) {
    throw error;
  }
};

export const getUserByIdWithPermissions = async (id) => {
  try {
    const query = `
      SELECT u.id, u.username, u.role, u.status, u.created_at, u.updated_at, u.created_by,
             array_agg(p.name) AS permissions
      FROM "user" u
      LEFT JOIN user_permission up ON u.id = up.user_id
      LEFT JOIN permission p ON up.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id;
    `;
    const values = [id];

    const { rows } = await pool.query(query, values);

    const user = rows.length === 0 ? null : rows[0];

    return user;
  } catch (error) {
    throw error;
  }
};
