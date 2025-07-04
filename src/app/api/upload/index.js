import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { DateTime } from "luxon";
import { calculateFileHash } from "@/lib/utils";
import { validate as isUUID } from "uuid";
import { countUploadsWhereDisplayNameLike } from "@/lib/upload";

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

  return {
    success: true,
    data: { ids, download },
  };
};

export const createFileBuffer = async (uploads) => {
  if (uploads.length === 1) {
    const { path: filePath, file_name: fileName } = uploads[0];

    const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
    const fileBuffer = await fs.readFile(absFilePath);

    return { fileBuffer, fileName };
  } else {
    const zip = new JSZip();
    const fileNames = [];
    for (const { path: filePath, file_name: fileName } of uploads) {
      const absFilePath = path.join(FILE_STORAGE_PATH, filePath);
      const fileData = fs.readFile(absFilePath);

      let uniqueFileName;
      if (fileNames.includes(fileName)) {
        const { ext, name } = path.parse(fileName);
        uniqueFileName = `${name}(1)${ext}`;
      } else {
        uniqueFileName = fileName;
      }

      zip.file(uniqueFileName, fileData);
      fileNames.push(uniqueFileName);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    return { fileBuffer: zipContent, fileName: "uploads.zip" };
  }
};

// --- Post request
export const validatePostRequest = async (request) => {
  const formData = await request.formData();
  const type = formData.get("type");

  const acceptableFileTypes = [
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (type === "file" || type === "api") {
    const file = formData.get("file");
    const validFile = acceptableFileTypes.includes(file?.type);

    if (!file || !validFile) {
      return {
        success: false,
        data: null,
        message: "Bad request: File missing or invalid type",
      };
    }
  } else if (type === "form") {
    const source = formData.get("source");
    const object = formData.get("object");
    const summary = formData.get("summary");
    const documents = formData.getAll("documents");
    if (!source) {
      return {
        success: false,
        data: null,
        message: "Bad request: 'source' is required",
      };
    }
    if (!object) {
      return {
        success: false,
        data: null,
        message: "Bad request: 'object' is required",
      };
    }
    if (!summary) {
      return {
        success: false,
        data: null,
        message: "Bad request: 'summary' is required",
      };
    }
    if (documents.length === 0) {
      return {
        success: false,
        data: null,
        message: "Bad request: At least one source document is required",
      };
    }
    for (const document of documents) {
      const type = document.get("type");
      const file = document.get("file");
      const message = document.get("message");
      if (!type || !["File", "Message", "Attachment"].includes(type)) {
        return {
          success: false,
          data: null,
          message: "Bad request: Invalid document type",
        };
      }
      if (!file) {
        return {
          success: false,
          data: null,
          message: "Bad request: Document file is required",
        };
      }
      if (type === "Attachment" && !message) {
        return {
          success: false,
          data: null,
          message: "Bad request: Message is required for attachments",
        };
      }
    }
  } else {
    return {
      success: false,
      data: null,
      message: "Bad request: Invalid type",
    };
  }

  return { success: true, data: { formData } };
};

export const constructUploadData = async (formData, userId) => {
  const uploadData = {};
  let fileData;

  const type = formData.get("type");

  const date = new Date();
  const formatDate = DateTime.fromJSDate(date).setLocale("fr");
  const formatDateForName = formatDate.toFormat("ddMMMMyyyy");
  const formatDateForPath = formatDate.toFormat("yyyyMMdd");

  const count = await countUploadsWhereDisplayNameLike(formatDateForName);
  const rank = count + 1;

  const dirPath = path.join("data", "uploads", formatDateForPath);
  const displayName = `${formatDateForName}-${type}-${rank}`;

  uploadData.userId = userId;
  uploadData.type = type;
  uploadData.date = date.toISOString();
  uploadData.displayName = displayName;

  if (type === "file" || type === "api") {
    const file = formData.get("file");

    const fileName = file.name;
    const filePath = path.join(dirPath, `${rank} - ${type} - ${fileName}`);

    uploadData.fileName = fileName;
    uploadData.path = filePath;

    fileData = Buffer.from(await file.arrayBuffer());
    uploadData.hash = calculateFileHash(fileData);
  } else {
    const source = formData.get("source");
    const object = formData.get("object");
    const summary = formData.get("summary");
    const documents = formData.getAll("documents");

    let dump = formData.get("dump");

    // construct data.json and fiche.docx
    // create a zipFile as fileData
    // calculate hash of the zipFile
    // suggest a fileName and path

    const fileName = `${formatDateForName}_formulaire.zip`;
    const filePath = path.join(dirPath, `${rank} - ${type} - ${fileName}`);
  }

  return { uploadData, fileData };
};

// --- DELETE request
export const validateDeleteRequest = async (request) => {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");

  if (!id) {
    return {
      success: false,
      data: null,
      message: "Bad request: 'id' required",
    };
  }

  const invalidId = !isUUID(id, 4);
  if (invalidId) {
    return {
      success: false,
      data: null,
      message: "Bad request: 'id' must be a valid UUID",
    };
  }

  return { success: true, data: { id } };
};
