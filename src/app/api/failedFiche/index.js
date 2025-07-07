import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { validate as isUUID } from "uuid";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

// --- GET request
export const validateGetRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.getAll("id");
  const download = searchParams.get("download");

  const invalidIds = ids.filter((id) => !isUUID(id, 4));
  if (invalidIds.length > 0) {
    return {
      success: false,
      data: [],
      message: "Bad request: 'id' must be a valid UUID",
    };
  }

  if (download !== null && download !== "true") {
    return {
      success: false,
      data: [],
      message: `Bad request: 'download' must be "true" or unset.`,
    };
  }

  return { success: true, data: { ids, download } };
};

export const createFileBuffer = async (fiches) => {
  if (fiches.length === 1) {
    const { path: filePath, file_name: fileName } = fiches[0];

    const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
    const fileBuffer = await fs.readFile(absFilePath);

    return { fileBuffer, fileName };
  } else {
    const zip = new JSZip();
    for (const { path: filePath } of fiches) {
      const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
      const fileBuffer = await fs.readFile(absFilePath);

      const fileName = path.basename(filePath);

      zip.file(fileName, fileBuffer);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    return { fileBuffer: zipContent, fileName: "fiches échouées.zip" };
  }
};

// --- DELETE request
export const validateDeleteRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.getAll("id");

  if (!ids.length) {
    return {
      valid: false,
      message: "Bad request: missing required query parameter 'id'",
    };
  }

  const validateIds = ids.every((id) => validate(id, 4));
  if (!validateIds) {
    return {
      valid: false,
      message: "Bad request: all 'id' values must be valid UUIDv4 strings",
    };
  }

  return { valid: true, data: { ids } };
};
