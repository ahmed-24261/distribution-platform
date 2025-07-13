import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const filePath = searchParams.get("path");

    const fullPath = path.join(FILE_STORAGE_PATH, filePath);

    try {
      await fs.access(fullPath, fs.constants.F_OK);
    } catch {
      return NextResponse.json(
        { error: { message: "File not found." } },
        { status: 404 }
      );
    }

    if (false) {
      // For downloading files
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            fileName
          )}"`,
          "Content-Type": "application/zip",
        },
      });
    }

    const fileContent = await fs.readFile(fullPath);

    const ext = path.extname(fullPath).toLowerCase();
    let mimeType;

    switch (ext) {
      case ".pdf":
        mimeType = "application/pdf";
        break;
      case ".doc":
        mimeType = "application/msword";
        break;
      case ".docx":
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${path.basename(fullPath)}"`,
      },
    });
  } catch (error) {
    console.error("Error serving file:", error.message);
    return NextResponse.json(
      { error: { message: "Internal Server Error" } },
      { status: 500 }
    );
  }
}
