import { Pool } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { DateTime } from "luxon";
import { createHash } from "crypto";

dotenv.config();

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();

  try {
    console.log("🧹 Clearing old data...");
    await client.query(`
      TRUNCATE
        attachments,
        exchanges,
        observations,
        fiche_themes,
        fiche_services,
        source_themes,
        failed_fiches,
        processes,
        uploads,
        user_permissions,
        permissions,
        group_sources,
        group_members,
        fiches,
        users,
        groups,
        sources,
        services,
        themes,
        exchangers
      RESTART IDENTITY CASCADE;
    `);

    console.log("🌱 Seeding...");

    // === SOURCES ===
    const sourceNames = ["books", "fruits", "materials", "clothes"];
    const sourceIds = {};

    for (const name of sourceNames) {
      const res = await client.query(
        `INSERT INTO sources (name) VALUES ($1) RETURNING id`,
        [name]
      );
      sourceIds[name] = res.rows[0].id;
    }

    // === USERS ===
    const users = [
      { username: "superAdmin", role: "superAdmin" },
      { username: "admin1", role: "admin" },
      { username: "admin2", role: "admin" },
      { username: "admin3", role: "admin" },
      { username: "user1", role: "user" },
      { username: "user2", role: "user" },
    ];

    const userIds = {};

    for (let i = 0; i < users.length; i++) {
      const { username, role } = users[i];
      const res = await client.query(
        `INSERT INTO users (username, password, role)
         VALUES ($1, $2, $3) RETURNING id`,
        [username, createHash("sha256").update(username).digest("hex"), role]
      );
      userIds[username] = res.rows[0].id;
    }

    // === GROUPS ===
    const groups = [
      { name: "group1", description: "group for books and fruits" },
      { name: "group2", description: "group for materials and clothes" },
      { name: "group3", description: "group for all sources" },
    ];

    const groupIds = {};
    for (let i = 0; i < groups.length; i++) {
      const { name, description } = groups[i];
      const res = await client.query(
        `INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id`,
        [name, description]
      );
      groupIds[name] = res.rows[0].id;
    }

    // === GROUP MEMBERS ===
    const groupMembers = [
      { username: "admin2", groupName: "group3" },
      { username: "user1", groupName: "group1" },
      { username: "user2", groupName: "group2" },
    ];
    for (let i = 0; i < groupMembers.length; i++) {
      const { username, groupName } = groupMembers[i];
      await client.query(
        `INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)`,
        [userIds[username], groupIds[groupName]]
      );
    }

    // === GROUP SOURCES ===
    const groupSources = [
      { groupName: "group1", sourceName: "books" },
      { groupName: "group1", sourceName: "fruits" },
      { groupName: "group2", sourceName: "materials" },
      { groupName: "group2", sourceName: "clothes" },
      { groupName: "group3", sourceName: "books" },
      { groupName: "group3", sourceName: "fruits" },
      { groupName: "group3", sourceName: "materials" },
      { groupName: "group3", sourceName: "clothes" },
    ];

    for (let i = 0; i < groupSources.length; i++) {
      await client.query(
        `INSERT INTO group_sources (group_id, source_id) VALUES ($1, $2)`,
        [
          groupIds[groupSources[i].groupName],
          sourceIds[groupSources[i].sourceName],
        ]
      );
    }

    // === SERVICES ===
    const services = [
      { name: "service1" },
      { name: "service2" },
      { name: "service3" },
      { name: "service4" },
      { name: "service5" },
    ];

    const serviceIds = {};
    for (let i = 0; i < services.length; i++) {
      const res = await client.query(
        `INSERT INTO services (name) VALUES ($1) RETURNING id`,
        [services[i].name]
      );
      serviceIds[services[i].name] = res.rows[0].id;
    }

    // === PERMISSIONS ===
    const permissions = [
      { name: "CAN_CREATE_UPLOAD", description: "can create upload" },
      { name: "CAN_GET_ALL_UPLOADS", description: "can get all uploads" },
      { name: "CAN_GET_OWN_UPLOADS", description: "can get own uploads" },
      {
        name: "CAN_PROCESS_ALL_UPLOADS",
        description: "can process all uploads",
      },
      {
        name: "CAN_PROCESS_OWN_UPLOADS",
        description: "can process own uploads",
      },

      { name: "CAN_DELETE_ALL_UPLOADS", description: "can delete all uploads" },
      { name: "CAN_DELETE_OWN_UPLOADS", description: "can delete own uploads" },
    ];

    const permissionIds = {};
    for (let i = 0; i < permissions.length; i++) {
      const res = await client.query(
        `INSERT INTO permissions (name, description) VALUES ($1, $2) RETURNING id`,
        [permissions[i].name, permissions[i].description]
      );
      permissionIds[permissions[i].name] = res.rows[0].id;
    }

    // === USER PERMISSIONS ===
    const userPermissions = [
      { username: "admin1", permissionName: "CAN_CREATE_UPLOAD" },
      { username: "admin1", permissionName: "CAN_GET_ALL_UPLOADS" },
      { username: "admin1", permissionName: "CAN_PROCESS_ALL_UPLOADS" },
      { username: "admin1", permissionName: "CAN_DELETE_ALL_UPLOADS" },

      { username: "admin2", permissionName: "CAN_CREATE_UPLOAD" },
      { username: "admin2", permissionName: "CAN_GET_ALL_UPLOADS" },
      { username: "admin2", permissionName: "CAN_PROCESS_ALL_UPLOADS" },
      { username: "admin2", permissionName: "CAN_DELETE_OWN_UPLOADS" },

      { username: "admin3", permissionName: "CAN_CREATE_UPLOAD" },
    ];

    for (let i = 0; i < userPermissions.length; i++) {
      const { username, permissionName } = userPermissions[i];
      await client.query(
        `INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2)`,
        [userIds[username], permissionIds[permissionName]]
      );
    }

    // === UPLOADS ===
    const uploadFolder = path.join("data", "uploads");
    const date1 = new Date("2024-03-12");
    const date2 = new Date("2024-03-13");
    const date3 = new Date("2025-06-02");

    const formatDate1 = DateTime.fromJSDate(date1).toFormat("yyyyMMdd");
    const formatDate2 = DateTime.fromJSDate(date2).toFormat("yyyyMMdd");
    const formatDate3 = DateTime.fromJSDate(date3).toFormat("yyyyMMdd");

    const uploads = [
      {
        user_id: userIds["admin1"],
        uploaded_at: date1,
        type: "file",
        file_name: "18fichesOfFruits.pdf",
        file_path: path.join(
          uploadFolder,
          formatDate1,
          "1 - 18fichesOfFruits.pdf"
        ),
        file_hash: createHash("sha256")
          .update("18fichesOfFruits.pdf")
          .digest("hex"),
      },

      {
        user_id: userIds["admin2"],
        uploaded_at: date1,
        type: "form",
        file_name: "fichesOfFruitsAndBooks.pdf",
        file_path: path.join(
          uploadFolder,
          formatDate1,
          "2 - fichesOfFruitsAndBooks.pdf"
        ),
        file_hash: createHash("sha256")
          .update("fichesOfFruitsAndBooks.pdf")
          .digest("hex"),
      },

      {
        user_id: userIds["admin2"],
        uploaded_at: date2,
        type: "file",
        file_name: "Date20240314.pdf",
        file_path: path.join(uploadFolder, formatDate2, "1 - Date20240314.pdf"),
        file_hash: createHash("sha256")
          .update("Date20240314.pdf")
          .digest("hex"),
      },

      {
        user_id: userIds["admin3"],
        uploaded_at: date1,
        type: "form",
        file_name: "byAdmin3.pdf",
        file_path: path.join(uploadFolder, formatDate3, "3 - byAdmin3.pdf"),
        file_hash: createHash("sha256").update("byAdmin3.pdf").digest("hex"),
      },

      {
        user_id: userIds["admin3"],
        uploaded_at: date3,
        type: "file",
        file_name: "fiches.pdf",
        file_path: path.join(uploadFolder, formatDate3, "1 - fiches.pdf"),
        file_hash: createHash("sha256").update("fiches.pdf").digest("hex"),
      },
    ];

    const uploadIds = {};

    for (let i = 0; i < uploads.length; i++) {
      const res = await client.query(
        `INSERT INTO uploads (user_id, uploaded_at, type, file_name, file_path, file_hash)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          uploads[i].user_id,
          uploads[i].uploaded_at,
          uploads[i].type,
          uploads[i].file_name,
          uploads[i].file_path,
          uploads[i].file_hash,
        ]
      );
      uploadIds[uploads[i].file_name] = res.rows[0].id;
    }

    for (let i = 0; i < uploads.length; i++) {
      const absFile = path.join(FILE_STORAGE_PATH, uploads[i].file_path);
      const dir = path.dirname(absFile);
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(absFile, uploads[i].file_hash, "utf-8");
    }

    // === PROCESSES ===
    const processes = [
      {
        upload_id: uploadIds["18fichesOfFruits.pdf"],
        user_id: userIds["admin1"],
        started_at: date2,
        ended_at: date3,
        status: "completed",
        attempt: 1,
      },
      {
        upload_id: uploadIds["fichesOfFruitsAndBooks.pdf"],
        user_id: userIds["admin1"],
        started_at: date2,
        status: "failed",
        attempt: 1,
      },
      {
        upload_id: uploadIds["fichesOfFruitsAndBooks.pdf"],
        user_id: userIds["admin1"],
        started_at: date3,
        status: "completed",
        attempt: 2,
      },

      {
        upload_id: uploadIds["fiches.pdf"],
        user_id: userIds["admin3"],
        started_at: date3,
        status: "failed",
        attempt: 1,
      },
    ];

    for (let i = 0; i < processes.length; i++) {
      await client.query(
        `INSERT INTO processes (upload_id, user_id, started_at, ended_at, status, attempt)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          processes[i].upload_id,
          processes[i].user_id,
          processes[i].started_at,
          processes[i].ended_at,
          processes[i].status,
          processes[i].attempt,
        ]
      );
    }

    const createSimplePdf = async (filePath, fileName, uploadedAt) => {
      // Ensure the directory exists
      await fsp.mkdir(path.dirname(filePath), { recursive: true });

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        doc.fontSize(20).text("Upload Summary", { underline: true });
        doc.moveDown();

        doc.fontSize(14).text(`File Name: ${fileName}`);
        doc.text(`Uploaded At: ${uploadedAt}`);

        doc.end();

        stream.on("finish", resolve);
        stream.on("error", reject);
      });
    };

    // Assuming uploads is defined and FILE_STORAGE_PATH as well
    for (let i = 0; i < uploads.length; i++) {
      const absFile = path.join(FILE_STORAGE_PATH, uploads[i].file_path);
      await createSimplePdf(
        absFile,
        uploads[i].file_name,
        uploads[i].uploaded_at
      );
    }

    console.log("✅ Seeding completed successfully.");
  } catch (err) {
    console.error("❌ Error during seeding:", err);
  } finally {
    await client.release();
    await pool.end();
  }
}

seed();
