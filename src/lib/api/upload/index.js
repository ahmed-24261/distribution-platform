import * as pathLib from "path";
import fs from "fs/promises";
import { DateTime } from "luxon";
import { calculateFileHash } from "@/lib/api";
import {
  createUpload as createUploadRecord,
  getUploadsWhereDisplayNameLike as getRank,
} from "@/lib/upload";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

// --- Post request
export const validateData = async (formData) => {
  try {
    const acceptableFileTypes = ["application/zip"];

    const type = formData.get("type");

    if (type === "file" || type === "api") {
      const file = formData.get("file");
      const validFile = acceptableFileTypes.includes(file?.type);
      if (!file || !validFile) {
        throw new Error("Bad request: File missing or invalid type");
      }
    } else if (type === "form") {
      const source = formData.get("source");
      const object = formData.get("object");
      const summary = formData.get("summary");
      const documents = formData.getAll("documents");
      if (!source) {
        throw new Error("Bad request: Source is required");
      }
      if (!object) {
        throw new Error("Bad request: Object is required");
      }
      if (!summary) {
        throw new Error("Bad request: Summary is required");
      }
      if (documents.length === 0) {
        throw new Error(
          "Bad request: At least one source document is required"
        );
      }
      for (const document of documents) {
        const type = document.get("type");
        const file = document.get("file");
        const message = document.get("message");
        if (!type || !["File", "Message", "Attachment"].includes(type)) {
          throw new Error("Bad request: Invalid document type");
        }
        if (!file) {
          throw new Error("Bad request: Document file is required");
        }
        if (type === "Attachment" && !message) {
          throw new Error("Bad request: Message is required for attachments");
        }
      }
    } else {
      throw new Error("Bad request: Invalid type");
    }

    return { valid: true, message: "Data is valid" };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

export const createUpload = async (formData, userId) => {
  const { data, fileData } = await constructData(formData, userId);

  const uploadId = await createUploadRecord(data);

  const absPath = pathLib.join(FILE_STORAGE_PATH, data.path);
  const absDirPath = pathLib.dirname(absPath);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(absDirPath, fileData);

  return uploadId;
};

const constructData = async (formData, userId) => {
  const type = formData.get("type");

  const data = { userId, type };
  let fileData;

  const date = new Date();
  const formatDate = DateTime.fromJSDate(date).setLocale("fr");
  const formatDateForName = formatDate.toFormat("ddMMMMyyyy");
  const formatDateForPath = formatDate.toFormat("yyyyMMdd");

  const rank = await getRank(formatDateForName).then((u) => u.length + 1);
  const dirPath = pathLib.join("data", "uploads", formatDateForPath);

  const displayName = `${formatDateForName}-${type}-${rank}`;

  data.date = date.toISOString();
  data.displayName = displayName;

  if (type === "file" || type === "api") {
    const file = formData.get("file");

    const fileName = file.name;
    const path = pathLib.join(dirPath, `${rank} - ${type} - ${fileName}`);

    data.fileName = fileName;
    data.path = path;

    fileData = Buffer.from(await file.arrayBuffer());
    data.hash = calculateFileHash(fileData);
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
    const path = pathLib.join(dirPath, `${rank} - ${type} - ${fileName}`);
  }

  return { data, fileData };
};
