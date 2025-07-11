import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { validate as isUUID } from "uuid";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

// --- GET request
export const validateGetRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.getAll("id");

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

  return {
    success: true,
    data: { ids, download, getFile },
  };
};

export const createFileBuffer = async (fiches) => {
  if (fiches.length === 1) {
    const zip = new JSZip();
    const { path: filePath, documents } = fiches[0];

    const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
    const fileBuffer = await fs.readFile(absFilePath);
    const fileName = path.basename(filePath);
    zip.file(fileName, fileBuffer);

    const folderName = path.basename(path.dirname(filePath));

    for (const document of documents) {
      const { path: filePath } = document;
      const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
      const fileBuffer = await fs.readFile(absFilePath);
      const fileName = path.basename(filePath);
      zip.file(fileName, fileBuffer);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    return { fileBuffer: zipContent, fileName: `${folderName}.zip` };
  } else {
    const zip = new JSZip();
    for (const { path: filePath, documents } of fiches) {
      const folderName = path.basename(path.dirname(filePath));

      const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
      const fileBuffer = await fs.readFile(absFilePath);
      const fileName = path.basename(filePath);
      zip.file(path.join(folderName, fileName), fileBuffer);

      for (const document of documents) {
        const { path: filePath } = document;
        const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
        const fileBuffer = await fs.readFile(absFilePath);
        const fileName = path.basename(filePath);
        zip.file(path.join(folderName, fileName), fileBuffer);
      }
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    return { fileBuffer: zipContent, fileName: "fiches.zip" };
  }
};

// --- PUT request
export const validatePutRequest = async (request) => {
  const jsonData = await request.json();

  const items = Array.isArray(jsonData) ? jsonData : [jsonData];

  for (const item of items) {
    const id = item?.id;
    const update = item?.update;

    if (!id) {
      return {
        success: false,
        data: [],
        message: "Bad request: 'id' required",
      };
    }

    if (!validate(id, 4)) {
      return {
        success: false,
        data: [],
        message: "Bad request: 'id' must be valid UUIDv4 string",
      };
    }

    if (!update) {
      return {
        success: false,
        data: [],
        message: "Bad request: 'update' required",
      };
    }

    return { success: true, data: { items } };
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
