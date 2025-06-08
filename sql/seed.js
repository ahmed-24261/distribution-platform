const { Pool } = require("pg");
const path = require("path");
const { consoleLog } = require("../consoleLog");
const crypto = require("crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

async function seed() {
  try {
    consoleLog("🌱 Seeding database...", "magenta");

    // Reset the database
    const resetQueries =
      "TRUNCATE TABLE users_permissions, permissions, users CASCADE;";
    await pool.query(resetQueries);

    // Insert permissions
    const permissions = [
      { name: "CAN_CREATE_UPLOAD", description: "can create upload" },
      { name: "CAN_GET_ALL_UPLOADS", description: "can get all uploads" },
      { name: "CAN_GET_OWN_UPLOADS", description: "can get own uploads" },
      { name: "CAN_UPDATE_ALL_UPLOAD", description: "can update upload" },
      { name: "CAN_UPDATE_OWN_UPLOAD", description: "can update own upload" },
      { name: "CAN_DELETE_ALL_UPLOADS", description: "can delete all uploads" },
      { name: "CAN_DELETE_OWN_UPLOADS", description: "can delete own uploads" },
    ];
    const permissionQueries = `INSERT INTO permissions (name, description) VALUES ${permissions
      .map((resource) => `('${resource.name}', '${resource.description}')`)
      .join(", ")} RETURNING id;`;

    const permissionRes = await pool.query(permissionQueries);
    const permissionIds = permissionRes.rows.map((row) => row.id);
    if (permissionIds.length !== permissions.length) {
      throw new Error("some permissions were not inserted");
    }
    const [
      canCreateUpload,
      canGetAllUploads,
      canGetOwnUploads,
      canUpdateAllUpload,
      canUpdateOwnUpload,
      canDeleteAllUploads,
      canDeleteOwnUploads,
    ] = permissionIds;

    // Insert users
    const users = [
      {
        username: "superAdmin",
        password: "SuperAdminPass1!",
        role: "superAdmin",
      },
      { username: "admin1", password: "AdminPass1!", role: "admin" },
      { username: "admin2", password: "AdminPass2!", role: "admin" },
      { username: "admin3", password: "AdminPass3!", role: "admin" },
      { username: "admin4", password: "AdminPass4!", role: "admin" },
      { username: "user1", password: "UserPass1!", role: "user" },
      { username: "user2", password: "UserPass2!", role: "user" },
      { username: "user3", password: "UserPass3!", role: "user" },
      { username: "user4", password: "UserPass4!", role: "user" },
      { username: "user5", password: "UserPass5!", role: "user" },
    ];

    const userQueries = `INSERT INTO users (username, password, role) VALUES ${users
      .map(
        (resource) =>
          `('${resource.username}', '${hashPassword(resource.password)}', '${
            resource.role
          }')`
      )
      .join(", ")} RETURNING id;`;

    const userRes = await pool.query(userQueries);
    const userIds = userRes.rows.map((row) => row.id);
    if (userIds.length !== users.length) {
      throw new Error("some users were not inserted");
    }

    const [
      superAdmin,
      admin1,
      admin2,
      admin3,
      admin4,
      user1,
      user2,
      user3,
      user4,
      user5,
    ] = userIds;

    // Insert users_permissions
    const userPermissions = [
      { userId: superAdmin, permissionId: canCreateUpload },
      { userId: superAdmin, permissionId: canGetAllUploads },
      { userId: superAdmin, permissionId: canGetOwnUploads },
      { userId: superAdmin, permissionId: canUpdateAllUpload },
      { userId: superAdmin, permissionId: canUpdateOwnUpload },
      { userId: superAdmin, permissionId: canDeleteAllUploads },
      { userId: superAdmin, permissionId: canDeleteOwnUploads },

      { userId: admin1, permissionId: canCreateUpload },
      { userId: admin1, permissionId: canGetAllUploads },
      { userId: admin1, permissionId: canGetOwnUploads },
      { userId: admin1, permissionId: canUpdateAllUpload },
      { userId: admin1, permissionId: canUpdateOwnUpload },
      { userId: admin1, permissionId: canDeleteAllUploads },

      { userId: admin2, permissionId: canCreateUpload },
      { userId: admin2, permissionId: canGetAllUploads },
      { userId: admin2, permissionId: canGetOwnUploads },
      { userId: admin2, permissionId: canUpdateAllUpload },
      { userId: admin2, permissionId: canUpdateOwnUpload },

      { userId: admin3, permissionId: canCreateUpload },
      { userId: admin3, permissionId: canGetAllUploads },
      { userId: admin3, permissionId: canGetOwnUploads },

      { userId: admin4, permissionId: canCreateUpload },
    ];

    const userPermissionQueries = `INSERT INTO users_permissions (user_id, permission_id) VALUES ${userPermissions
      .map((up) => `(${up.userId}, ${up.permissionId})`)
      .join(", ")} RETURNING id;`;

    consoleLog("✅ Seed complete.", "green");
  } catch (error) {
    consoleLog("❌ Seed failed: " + error.message, "red");
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
