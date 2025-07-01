import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePaths = searchParams.getAll("filePath");
    const fileNameParam = searchParams.get("fileName");

    if (filePaths.length === 0) {
      return NextResponse.json(
        {
          data: null,
          message: "Bad request: 'filePath' required",
        },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    if (filePaths.length === 1) {
      const filePath = filePaths[0];
      const absFilePath = path.join(FILE_STORAGE_PATH, filePath);

      if (!fs.existsSync(absFilePath)) {
        return NextResponse.json(
          { data: null, message: "Not found: file not found" },
          { status: 404 }
        );
      }

      const fileBuffer = fs.readFileSync(absFilePath);
      const fileName = fileNameParam || path.basename(absFilePath);

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            fileName
          )}"`,
          "Content-Type": "application/octet-stream",
        },
      });
    } else {
      // Multiple files → ZIP
      for (const filePath of filePaths) {
        const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
        if (!fs.existsSync(absFilePath)) continue;
        const fileData = fs.readFileSync(absFilePath);
        const fileName = path.basename(absFilePath);
        zip.file(fileName, fileData);
      }

      const zipContent = await zip.generateAsync({ type: "nodebuffer" });

      const zipName = fileNameParam || "download.zip";

      return new NextResponse(zipContent, {
        headers: {
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            zipName
          )}"`,
          "Content-Type": "application/zip",
        },
      });
    }
  } catch {
    return NextResponse.json(
      { data: null, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
