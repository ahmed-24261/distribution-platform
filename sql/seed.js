import { Pool } from "pg";
import crypto from "crypto";
import dotenv from "dotenv";
import { consoleLog } from "../consoleLog/index.js";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const hashFunction = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

async function seed() {
  try {
    consoleLog("🌱 Seeding database...", "magenta");

    // Reset the database
    const resetQueries = `TRUNCATE TABLE upload, user_permission, permission, "user" CASCADE;`;
    await pool.query(resetQueries);

    // Insert permissions
    const permissions = [
      { name: "CAN_CREATE_UPLOAD", description: "can create upload" },
      { name: "CAN_GET_ALL_UPLOADS", description: "can get all uploads" },
      { name: "CAN_GET_OWN_UPLOADS", description: "can get own uploads" },
      { name: "CAN_UPDATE_ALL_UPLOADS", description: "can update upload" },
      { name: "CAN_UPDATE_OWN_UPLOADS", description: "can update own upload" },
      { name: "CAN_DELETE_ALL_UPLOADS", description: "can delete all uploads" },
      { name: "CAN_DELETE_OWN_UPLOADS", description: "can delete own uploads" },
    ];
    const permissionQueries = `INSERT INTO permission (name, description) VALUES ${permissions
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

    const userQueries = `INSERT INTO "user" (username, password, role) VALUES ${users
      .map(
        (resource) =>
          `('${resource.username}', '${hashFunction(resource.password)}', '${
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

    consoleLog("admin 1:\n" + admin1, "green");
    consoleLog("admin 2:\n" + admin2, "green");
    consoleLog("admin 3:\n" + admin3, "green");
    consoleLog("admin 4:\n" + admin4, "green");

    // Insert users_permissions
    const userPermission = [
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
      { userId: admin2, permissionId: canGetOwnUploads },
      { userId: admin2, permissionId: canUpdateAllUpload },
      { userId: admin2, permissionId: canUpdateOwnUpload },
      { userId: admin2, permissionId: canDeleteOwnUploads },

      { userId: admin3, permissionId: canCreateUpload },
      { userId: admin3, permissionId: canGetAllUploads },
      { userId: admin3, permissionId: canGetOwnUploads },
      { userId: admin3, permissionId: canDeleteAllUploads },

      { userId: admin4, permissionId: canCreateUpload },
    ];

    const userPermissionQueries = `INSERT INTO user_permission (user_id, permission_id) VALUES ${userPermission
      .map((up) => `('${up.userId}', '${up.permissionId}')`)
      .join(", ")} RETURNING *;`;

    const userPermissionRes = await pool.query(userPermissionQueries);

    // insert uploads
    const uploads = [
      {
        userId: admin1,
        displayName: "14décembre2022-Form-1",
        type: "form",
        date: new Date("2022-12-14").toISOString(),
        fileName: "TwoZipFiles.zip",
        path: "data/uploads/20221214/1 - Form - TwoZipFiles.zip",
        hash: hashFunction("TwoZipFiles.zip"),
      },
      {
        userId: admin1,
        displayName: "18mars2022-Form-1",
        type: "form",
        date: new Date("2022-03-18").toISOString(),
        fileName: "fiches.zip",
        path: "data/uploads/20220318/1 - Form - fiches.zip",
        hash: hashFunction("fiches.zip"),
      },
      {
        userId: admin2,
        displayName: "14décembre2022-File-2",
        type: "file",
        date: new Date("2022-12-15").toISOString(),
        fileName: "dumpOfFiche.zip",
        path: "data/uploads/20221214/2 - File - dumpOfFiche.zip",
        hash: hashFunction("dumpOfFiche.zip"),
      },
      {
        userId: admin3,
        displayName: "14décembre2022-File-3",
        type: "file",
        date: new Date("2022-12-14").toISOString(),
        fileName: "secondDump.zip",
        path: "data/uploads/20221214/3 - File - secondDump.zip",
        hash: hashFunction("secondDump.zip"),
      },
      {
        userId: admin4,
        displayName: "14décembre2022-API-4",
        type: "api",
        date: new Date("2022-12-10").toISOString(),
        fileName: "dumpFromAPI.zip",
        path: "data/uploads/20221214/4 - API - dumpFromAPI.zip",
        hash: hashFunction("dumpFromAPI.zip"),
      },
    ];

    const uploadQueries = `INSERT INTO upload (user_id, display_name, type, date,file_name, path, hash) VALUES ${uploads
      .map(
        (resource) =>
          `('${resource.userId}', '${resource.displayName}', '${resource.type}', '${resource.date}', '${resource.fileName}', '${resource.path}', '${resource.hash}')`
      )
      .join(", ")} RETURNING id;`;

    const uploadRes = await pool.query(uploadQueries);
    const uploadIds = uploadRes.rows.map((row) => row.id);
    if (uploadIds.length !== uploads.length) {
      throw new Error("some uploads were not inserted");
    }
    const [upload1, upload2, upload3, upload4, upload5] = uploadIds;

    // insert sources
    const sources = [
      { name: "books", description: "books source" },
      { name: "fruits", description: "fruits source" },
    ];
    const sourceQueries = `INSERT INTO source (name, description) VALUES ${sources
      .map((resource) => `('${resource.name}', '${resource.description}')`)
      .join(", ")} RETURNING id;`;

    const sourceRes = await pool.query(sourceQueries);
    const sourceIds = sourceRes.rows.map((row) => row.id);
    if (sourceIds.length !== sources.length) {
      throw new Error("some sources were not inserted");
    }

    consoleLog("✅ Seed complete.", "green");
  } catch (error) {
    consoleLog("❌ Seed failed: " + error.message, "red");
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
