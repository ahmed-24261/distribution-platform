import pool from "@/lib/db";

export const getUserByIdWithPermissions = async (id) => {
  try {
    const query = `
      SELECT u.id, u.username, u.role, u.status, u."createdAt", u."updatedAt", u."createdBy",
             array_agg(p.name) AS permissions
      FROM "user" u
      LEFT JOIN "userPermission" up ON u.id = up."userId"
      LEFT JOIN permission p ON up."permissionId" = p.id
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
      SELECT id, username, role, status, "createdAt", "updatedAt", "createdBy" 
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
