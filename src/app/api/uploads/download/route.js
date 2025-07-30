import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadById,
  getUploadsWhere,
  buildUploadBuffer,
} from "@/lib/uploads";
import { createZipBuffer } from "@/lib/utils";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    const { id: userId, permissions = [] } = await getUser();
    const canGetAllUploads = permissions.includes("CAN_GET_ALL_UPLOADS");
    const canGetOwnUploads = permissions.includes("CAN_GET_OWN_UPLOADS");

    if (ids.length === 1) {
      const upload = await getUploadById(ids[0]);

      if (!upload) {
        return NextResponse.json(
          {
            success: false,
            message: "Téléversement introuvable",
          },
          { status: 404 }
        );
      }

      const isNotAllowed =
        !canGetAllUploads && (!canGetOwnUploads || upload.user_id !== userId);

      if (isNotAllowed) {
        return NextResponse.json(
          {
            success: false,
            message: "Permissions insuffisantes",
          },
          { status: 403 }
        );
      }

      const fileBuffer = await buildUploadBuffer(upload);

      if (!fileBuffer) {
        return NextResponse.json(
          {
            success: false,
            message: "Fichier du téléversement introuvable",
          },
          { status: 404 }
        );
      }

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename=${encodeURIComponent(
            upload.file_name
          )}`,
        },
      });
    }

    const where = { uploads: {} };
    if (canGetAllUploads) {
      if (ids.length) where.uploads.id = ids;
    } else if (canGetOwnUploads) {
      if (ids.length) where.uploads.id = ids;
      where.uploads.user_id = userId;
    } else {
      where.uploads.id = [];
    }

    const uploads = await getUploadsWhere(where);

    const fileBuffers = [];
    const fileNames = [];

    for (const upload of uploads) {
      const buffer = await buildUploadBuffer(upload);
      if (buffer) {
        fileBuffers.push(buffer);
        fileNames.push(upload.file_name);
      }
    }

    const zipBuffer = await createZipBuffer(fileBuffers, fileNames);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=Téléversements.zip`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
