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
    const resetQueries = `TRUNCATE TABLE observations, failed_fiche, group_source, document, fiche, source, upload, user_permission, permission, "user", "group" CASCADE;`;
    await pool.query(resetQueries);

    // insert sources
    const sources = [
      { name: "books", description: "books source" },
      { name: "fruits", description: "fruits source" },
      { name: "locations", description: "locations source" },
    ];
    const sourceQueries = `INSERT INTO source (name, description) VALUES ${sources
      .map((resource) => `('${resource.name}', '${resource.description}')`)
      .join(", ")} RETURNING id;`;

    const sourceRes = await pool.query(sourceQueries);
    const sourceIds = sourceRes.rows.map((row) => row.id);
    if (sourceIds.length !== sources.length) {
      throw new Error("some sources were not inserted");
    }

    const [source1, source2, source3] = sourceIds;

    // insert groups
    const groups = [
      { name: "group-books", description: "group for books" },
      { name: "group-fruits", description: "group for fruits" },
      { name: "group-all", description: "group for all" },
    ];
    const groupQueries = `INSERT INTO "group" (name, description) VALUES ${groups
      .map((resource) => `('${resource.name}', '${resource.description}')`)
      .join(", ")} RETURNING id;`;

    const groupRes = await pool.query(groupQueries);
    const groupIds = groupRes.rows.map((row) => row.id);
    if (groupIds.length !== groups.length) {
      throw new Error("some groups were not inserted");
    }

    const [group1, group2, group3] = groupIds;

    // insert group_source
    const groupSource = [
      { groupId: group1, sourceId: source1 },

      { groupId: group2, sourceId: source2 },

      { groupId: group3, sourceId: source1 },
      { groupId: group3, sourceId: source2 },
      { groupId: group3, sourceId: source3 },
    ];

    const groupSourceQueries = `INSERT INTO group_source (group_id, source_id) VALUES ${groupSource
      .map((gs) => `('${gs.groupId}', '${gs.sourceId}')`)
      .join(", ")} RETURNING *;`;

    const groupSourceRes = await pool.query(groupSourceQueries);

    // Insert permissions
    const permissions = [
      { name: "CAN_CREATE_UPLOAD", description: "can create upload" },
      { name: "CAN_GET_ALL_UPLOADS", description: "can get all uploads" },
      { name: "CAN_GET_OWN_UPLOADS", description: "can get own uploads" },
      { name: "CAN_UPDATE_ALL_UPLOADS", description: "can update upload" },
      { name: "CAN_UPDATE_OWN_UPLOADS", description: "can update own upload" },
      { name: "CAN_DELETE_ALL_UPLOADS", description: "can delete all uploads" },
      { name: "CAN_DELETE_OWN_UPLOADS", description: "can delete own uploads" },

      {
        name: "CAN_DOWNLOAD_ALL_UPLOADS",
        description: "can download all uploads",
      },
      {
        name: "CAN_DOWNLOAD_OWN_UPLOADS",
        description: "can download own uploads",
      },
      { name: "CAN_GET_FICHES", description: "can get fiches" },

      { name: "CAN_UPDATE_ALL_FICHES", description: "can update all fiches" },
      { name: "CAN_UPDATE_OWN_FICHES", description: "can update own fiches" },

      { name: "CAN_DELETE_ALL_FICHES", description: "can delete all fiches" },
      { name: "CAN_DELETE_OWN_FICHES", description: "can delete own fiches" },

      {
        name: "CAN_DOWNLOAD_ALL_FICHES",
        description: "can download all fiches",
      },
      {
        name: "CAN_DOWNLOAD_OWN_FICHES",
        description: "can download own fiches",
      },
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
      canDownloadAllUploads,
      canDownloadOwnUploads,
      canGetFiches,
      canUpdateAllFiches,
      canUpdateOwnFiches,
      canDeleteAllFiches,
      canDeleteOwnFiches,
      canDownloadAllFiches,
      canDownloadOwnFiches,
    ] = permissionIds;

    // Insert admins
    const admins = [
      {
        username: "superAdmin",
        password: "SuperAdminPass1!",
        role: "superAdmin",
      },
      { username: "admin1", password: "AdminPass1!", role: "admin" },
      { username: "admin2", password: "AdminPass2!", role: "admin" },
      { username: "admin3", password: "AdminPass3!", role: "admin" },
      { username: "admin4", password: "AdminPass4!", role: "admin" },
    ];

    const adminQueries = `INSERT INTO "user" (username, password, role) VALUES ${admins
      .map(
        (resource) =>
          `('${resource.username}', '${hashFunction(resource.password)}', '${
            resource.role
          }')`
      )
      .join(", ")} RETURNING id;`;

    const adminRes = await pool.query(adminQueries);
    const adminIds = adminRes.rows.map((row) => row.id);
    if (adminIds.length !== admins.length) {
      throw new Error("some users were not inserted");
    }

    const [superAdmin, admin1, admin2, admin3, admin4] = adminIds;

    consoleLog("admin 1:\n" + admin1, "green");
    consoleLog("admin 2:\n" + admin2, "green");
    consoleLog("admin 3:\n" + admin3, "green");
    consoleLog("admin 4:\n" + admin4, "green");

    // Insert admins
    const users = [
      {
        username: "user1",
        password: "UserPass1!",
        role: "user",
        groupId: group1,
      },
      {
        username: "user2",
        password: "UserPass2!",
        role: "user",
        groupId: group2,
      },
      {
        username: "user3",
        password: "UserPass3!",
        role: "user",
        groupId: group3,
      },
      {
        username: "user4",
        password: "UserPass4!",
        role: "user",
        groupId: group3,
      },
      {
        username: "user5",
        password: "UserPass5!",
        role: "user",
        groupId: group3,
      },
    ];

    const userQueries = `INSERT INTO "user" (username, password, role, group_id) VALUES ${users
      .map(
        (resource) =>
          `('${resource.username}', '${hashFunction(resource.password)}', '${
            resource.role
          }', '${resource.groupId}')`
      )
      .join(", ")} RETURNING id;`;

    const userRes = await pool.query(userQueries);
    const userIds = userRes.rows.map((row) => row.id);
    if (userIds.length !== users.length) {
      throw new Error("some users were not inserted");
    }

    const [user1, user2, user3, user4, user5] = userIds;

    console.log("-----------------");
    consoleLog("user 1:\n" + user1, "green");
    consoleLog("user 2:\n" + user2, "green");
    consoleLog("user 3:\n" + user3, "green");
    consoleLog("user 4:\n" + user4, "green");
    consoleLog("user 5:\n" + user5, "green");

    // Insert users_permissions
    const userPermission = [
      { userId: superAdmin, permissionId: canCreateUpload },
      { userId: superAdmin, permissionId: canGetAllUploads },
      { userId: superAdmin, permissionId: canGetOwnUploads },
      { userId: superAdmin, permissionId: canUpdateAllUpload },
      { userId: superAdmin, permissionId: canUpdateOwnUpload },
      { userId: superAdmin, permissionId: canDeleteAllUploads },
      { userId: superAdmin, permissionId: canDeleteOwnUploads },
      { userId: superAdmin, permissionId: canDeleteAllFiches },
      { userId: superAdmin, permissionId: canDeleteOwnFiches },
      { userId: superAdmin, permissionId: canUpdateAllFiches },
      { userId: superAdmin, permissionId: canUpdateOwnFiches },

      { userId: admin1, permissionId: canCreateUpload },
      { userId: admin1, permissionId: canGetAllUploads },
      { userId: admin1, permissionId: canGetOwnUploads },
      { userId: admin1, permissionId: canUpdateAllUpload },
      { userId: admin1, permissionId: canUpdateOwnUpload },
      { userId: admin1, permissionId: canDeleteAllUploads },
      { userId: admin1, permissionId: canDownloadAllUploads },
      { userId: admin1, permissionId: canGetFiches },

      { userId: admin1, permissionId: canDeleteAllFiches },
      { userId: admin1, permissionId: canDeleteOwnFiches },
      { userId: admin1, permissionId: canUpdateAllFiches },
      { userId: admin1, permissionId: canUpdateOwnFiches },
      { userId: admin1, permissionId: canDownloadAllFiches },

      { userId: admin2, permissionId: canCreateUpload },
      { userId: admin2, permissionId: canGetOwnUploads },
      { userId: admin2, permissionId: canUpdateOwnUpload },
      { userId: admin2, permissionId: canDeleteOwnUploads },
      { userId: admin2, permissionId: canDownloadOwnUploads },
      { userId: admin2, permissionId: canDownloadOwnFiches },

      { userId: admin2, permissionId: canDeleteOwnFiches },
      { userId: admin2, permissionId: canUpdateOwnFiches },

      { userId: admin3, permissionId: canCreateUpload },
      { userId: admin3, permissionId: canGetAllUploads },
      { userId: admin3, permissionId: canGetOwnUploads },
      { userId: admin3, permissionId: canDeleteOwnUploads },
      { userId: admin3, permissionId: canUpdateOwnUpload },

      { userId: admin4, permissionId: canCreateUpload },
      { userId: admin4, permissionId: canGetAllUploads },

      { userId: user1, permissionId: canGetFiches },
      { userId: user2, permissionId: canGetFiches },
      { userId: user3, permissionId: canGetFiches },
      { userId: user4, permissionId: canGetFiches },
      { userId: user5, permissionId: canGetFiches },
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

    const uploadQueries = `INSERT INTO upload (user_id, display_name, type, date, file_name, path, hash) VALUES ${uploads
      .map(
        (resource) =>
          `('${resource.userId}', '${resource.displayName}', '${resource.type}', '${resource.date}', '${resource.fileName}', '${resource.path}', '${resource.hash}')`
      )
      .join(", ")} RETURNING id;`;

    // const uploadRes = await pool.query(uploadQueries);
    // const uploadIds = uploadRes.rows.map((row) => row.id);
    // if (uploadIds.length !== uploads.length) {
    //   throw new Error("some uploads were not inserted");
    // }
    // const [upload1, upload2, upload3, upload4, upload5] = uploadIds;

    consoleLog("✅ Seed complete.", "green");
  } catch (error) {
    consoleLog("❌ Seed failed: " + error, "red");
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
