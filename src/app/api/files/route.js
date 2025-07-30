import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getUploadById } from "@/lib/uploads";
import { getFicheWhere } from "@/lib/fiches";
import { getDocumentWhere } from "@/lib/documents";
import { getFailedFicheById } from "@/lib/failedFiches";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { generateFiche } from ".";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");
    const tables = searchParams.getAll("table");
    const download = searchParams.get("download");
    const file = searchParams.get("file");

    if (
      !ids.length ||
      !tables.length ||
      ids.length !== tables.length ||
      (!download && !file)
    ) {
      return NextResponse.json(
        { success: false, data: [], message: "Mauvaise requête" },
        { status: 400 }
      );
    }

    const { id: userId, role, permissions = [] } = await getUser();
    const canGetAllUploads = permissions.includes("CAN_GET_ALL_UPLOADS");
    const canGetOwnUploads = permissions.includes("CAN_GET_OWN_UPLOADS");
    const canGetFiches = permissions.includes("CAN_GET_FICHES");

    if (download) {
      const buffers = [];
      const fileNames = [];
      const errors = [];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const table = tables[i];

        if (table === "uploads") {
          const upload = await getUploadById(id);
          if (!upload) {
            errors.push({
              message: "Téléversement introuvable",
              status: 404,
            });

            continue;
          }

          if (
            !canGetAllUploads &&
            (!canGetOwnUploads || upload.user_id !== userId)
          ) {
            errors.push({
              message: "Autorisation insuffisante",
              status: 403,
            });

            continue;
          }

          const filePath = path.join(FILE_STORAGE_PATH, upload.file_path);
          const fileName = upload.file_name;
          try {
            await fs.access(filePath, fs.constants.F_OK);
          } catch {
            errors.push({
              message: "Fichier du téléversement introuvable",
              status: 404,
            });

            continue;
          }

          const fileBuffer = await fs.readFile(filePath);

          buffers.push(fileBuffer);
          fileNames.push(fileName);
        } else if (table === "fiches") {
          if (!canGetFiches) {
            errors.push({
              message: "Autorisation insuffisante",
              status: 403,
            });

            continue;
          }

          const where = { fiches: {}, users: {} };

          where.fiches.id = id;
          if (role === "user") {
            where.fiches.status = "valid";
            where.users.id = userId;
          }

          const fiche = await getFicheWhere(where);
          if (!fiche) {
            errors.push({
              message: "Fiche introuvable",
              status: 404,
            });

            continue;
          }

          const filePath = path.join(FILE_STORAGE_PATH, fiche.file_path);
          const fileName = path.basename(filePath);
          try {
            await fs.access(filePath, fs.constants.F_OK);
          } catch {
            errors.push({
              message: "Fichier de la fiche introuvable",
              status: 404,
            });

            continue;
          }

          const buffer = await fs.readFile(filePath);

          const zip = new JSZip();
          zip.file(fileName, buffer);

          let breakPoint = false;
          for (const document of fiche.documents) {
            if (breakPoint) break;

            const filePath = path.join(FILE_STORAGE_PATH, document.file_path);
            const fileName = path.basename(filePath);

            try {
              await fs.access(filePath, fs.constants.F_OK);
            } catch {
              errors.push({
                message: `Fichier du document ${fileName} de la fiche introuvable`,
                status: 404,
              });
              breakPoint = true;
              continue;
            }

            const fileBuffer = await fs.readFile(filePath);
            zip.file(fileName, fileBuffer);
          }

          if (breakPoint) continue;

          const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
          const productName = path.basename(path.dirname(filePath)) + ".zip";

          buffers.push(zipBuffer);
          fileNames.push(productName);
        } else if (table === "failed_fiches") {
          const fiche = await getFailedFicheById(id);

          if (!fiche) {
            errors.push({
              message: "Fiche échouée introuvable",
              status: 404,
            });

            continue;
          }

          if (
            !canGetAllUploads &&
            (!canGetOwnUploads || fiche.user_id !== userId)
          ) {
            errors.push({
              message: "Autorisation insuffisante",
              status: 403,
            });

            continue;
          }

          const filePath = path.join(FILE_STORAGE_PATH, fiche.file_path);
          const fileName = fiche.file_name;
          try {
            await fs.access(filePath, fs.constants.F_OK);
          } catch {
            errors.push({
              message: "Fichier de la fiche échouée introuvable",
              status: 404,
            });

            continue;
          }

          const fileBuffer = await fs.readFile(filePath);

          buffers.push(fileBuffer);
          fileNames.push(fileName);
        } else if (table === "documents") {
          if (!canGetFiches) {
            return NextResponse.json(
              {
                success: false,
                data: null,
                message: "Autorisation insuffisante",
              },
              { status: 403 }
            );
          }

          const where = { documents: {}, fiches: {}, users: {} };

          where.documents.id = id;
          if (role === "user") {
            where.fiches.status = "valid";
            where.users.id = userId;
          }

          const document = await getDocumentWhere(where);
          if (!document) {
            return NextResponse.json(
              {
                success: false,
                data: null,
                message: "Document introuvable",
              },
              { status: 404 }
            );
          }

          const filePath = path.join(FILE_STORAGE_PATH, document.file_path);
          const fileName = document.file_name;
          const fileContent = await fs.readFile(filePath);

          buffers.push(fileContent);
          fileNames.push(fileName);
        } else {
          errors.push({
            message: `Table ${table} non supportée`,
            status: 400,
          });
        }
      }

      if (buffers.length === 0) {
        return NextResponse.json(
          { success: false, data: null, message: "Aucun fichier trouvé" },
          { status: 404 }
        );
      } else if (buffers.length === 1) {
        return new NextResponse(buffers[0], {
          headers: {
            "Content-Disposition": `attachment; filename="${encodeURIComponent(
              fileNames[0]
            )}"`,
            "Content-Type": "application/zip",
          },
        });
      } else {
        const zip = new JSZip();
        buffers.forEach((buffer, index) => {
          zip.file(fileNames[index], buffer);
        });

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        let fileName;
        fileName = tables.every((table) => table === "fiches")
          ? "fiches.zip"
          : fileName;
        fileName = tables.every((table) => table === "uploads")
          ? "uploads.zip"
          : fileName;
        fileName = tables.every((table) => table === "failed_fiches")
          ? "failed_fiches.zip"
          : fileName;

        if (!fileName) {
          fileName = "downloads.zip";
        }

        return new NextResponse(zipBuffer, {
          headers: {
            "Content-Disposition": `attachment; filename=${encodeURIComponent(
              fileName
            )}`,
            "Content-Type": "application/zip",
          },
        });
      }
    } else if (file) {
      const id = ids[0];
      const table = tables[0];

      if (table === "fiches") {
        if (!canGetFiches) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              message: "Autorisation insuffisante",
            },
            { status: 403 }
          );
        }

        const where = { fiches: {}, users: {} };

        where.fiches.id = id;
        if (role === "user") {
          where.fiches.status = "valid";
          where.users.id = userId;
        }

        const fiche = await getFicheWhere(where);
        if (!fiche) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              message: "Fiche introuvable",
            },
            { status: 404 }
          );
        }

        const { date, source, object, summary, file_path } = fiche;
        const fileContent = await generateFiche(date, source, object, summary);
        const fileName = `${path.parse(file_path).name}.pdf`;

        return new NextResponse(fileContent, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${fileName}"`,
          },
        });
      } else if (table === "documents") {
        if (!canGetFiches) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              message: "Autorisation insuffisante",
            },
            { status: 403 }
          );
        }

        const where = { documents: {}, fiches: {}, users: {} };

        where.documents.id = id;
        if (role === "user") {
          where.fiches.status = "valid";
          where.users.id = userId;
        }

        const document = await getDocumentWhere(where);
        if (!document) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              message: "Document introuvable",
            },
            { status: 404 }
          );
        }

        const filePath = path.join(FILE_STORAGE_PATH, document.file_path);
        const fileContent = await fs.readFile(filePath);
        return new NextResponse(fileContent, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${path.basename(
              filePath
            )}"`,
          },
        });
      } else {
        return NextResponse.json(
          { success: false, data: null, message: "Mauvaise requête" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: true, data: "Done", message: null },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { success: false, data: [], message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
