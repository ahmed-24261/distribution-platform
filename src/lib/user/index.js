import pool from "@/lib/db";

export const getUserByIdWithPermissions = async (id) => {
  const query = `
      SELECT u.id, u.username, u.role, u.status, u.created_at, u.updated_at, u.created_by,
             array_agg(p.name) AS permissions
      FROM users u
      LEFT JOIN users_permissions up ON u.id = up.user_id
      LEFT JOIN permissions p ON up.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id;
    `;
  const values = [id];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0];
};

export const getUserIdByUsername = async (username) => {
  const query = `
      SELECT id
      FROM  users
      WHERE username = $1`;
  const values = [username];

  const { rows, rowCount } = await pool.query(query, values);

  if (!rowCount) return null;

  return rows[0].id;
};
