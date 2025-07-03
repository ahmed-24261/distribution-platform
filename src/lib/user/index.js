import pool from "@/lib/db";

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

    const { rows, rowCount } = await pool.query(query, values);

    if (!rowCount) return { not_found: true };

    return { ok: true, data: rows[0] };
  } catch {
    return { error: true };
  }
};

export const getUserByUsername = async (username) => {
  try {
    const query = `
      SELECT id, username, role, status, created_at, updated_at, created_by
      FROM "user" 
      WHERE username = $1`;
    const values = [username];

    const { rows, rowCount } = await pool.query(query, values);

    if (!rowCount) return { not_found: true };

    return { ok: true, data: rows[0] };
  } catch {
    return { error: true };
  }
};
