import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadBuffer,
  getFicheBuffer,
  getDocumentBuffer,
  getProductBuffer,
  getReportBuffer,
  getFailedFicheBuffer,
} from ".";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");
    const tables = searchParams.getAll("table");
    const download = searchParams.get("download");
    const getFile = searchParams.get("getFile");
    const downloadReport = searchParams.get("downloadReport");
    const downloadMode = searchParams.get("downloadMode");
    const downloadExtension = searchParams.get("downloadExtension");

    const user = await getUser();

    if (download) {
      const fileBuffers = [];
      const fileNames = [];
      const errors = [];

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const table = tables[i];

        let result;

        if (table === "uploads") {
          result = await getUploadBuffer(id, user);
        } else if (table === "fiches") {
          result = await getFicheBuffer(id, user);
        } else if (table === "documents") {
          result = await getDocumentBuffer(id, user);
        } else if (table === "products") {
          result = await getProductBuffer(id, user);
        } else if (table === "failed_fiches") {
          result = await getFailedFicheBuffer(id, user);
        } else {
          result = {
            data: null,
            error: { message: "Type de fichier non supportée", status: 400 },
          };
        }

        const { data, error } = result;

        if (error) {
          errors.push(error);
        } else {
          const { fileBuffer, fileName } = data;
          fileBuffers.push(fileBuffer);
          fileNames.push(fileName);
        }
      }

      if (ids.length === 1 && errors.length) {
        return NextResponse.json(
          { success: false, data: null, message: errors[0].message },
          { status: errors[0].status }
        );
      }

      const { fileBuffer, fileName } =
        ids.length === 1
          ? { fileBuffer: fileBuffers[0], fileName: fileNames[0] }
          : constructZipFile(fileBuffers, fileNames);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename=${encodeURIComponent(
            fileName
          )}`,
        },
      });
    } else if (getFile) {
      const id = ids[0];
      const table = tables[0];

      let result;

      if (table === "fiches") {
        result = await getFicheBuffer(id, user);
      } else if (table === "documents") {
        result = await getDocumentBuffer(id, user);
      } else if (table === "report") {
        result = await getReportBuffer(id, user);
      } else {
        result = {
          data: null,
          error: { message: "Type de fichier non supportée", status: 400 },
        };
      }

      const { data, error } = result;

      if (error) {
        return NextResponse.json(
          { success: false, data: [], message: error.message },
          { status: error.status }
        );
      }

      const { fileBuffer, fileName } = data;

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline;filename=${encodeURIComponent(
            fileName
          )}`,
        },
      });
    } else if (downloadReport) {
      const [id, ...docIds] = ids;

      const { data, error } = await getReportBuffer(id, user, {
        docIds,
        downloadMode,
      });

      if (error) {
        return NextResponse.json(
          { success: false, data: null, message: error.message },
          { status: error.status }
        );
      }
      const { fileBuffer, fileName } = data;
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline;filename=${encodeURIComponent(
            fileName
          )}`,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, data: null, message: "Mauvaise requête" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { success: false, data: [], message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
