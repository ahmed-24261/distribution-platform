import path from "path";
import { DateTime } from "luxon";
import { calculateFileHash } from "@/lib/utils";
import { validate as isUUID } from "uuid";
import { countUploadsByDisplayName } from "@/lib/uploads";

const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH;

// --- GET request
export const validateGetRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.getAll("id");

  const countInvalidIds = ids.filter((id) => !isUUID(id, 4)).length;
  if (countInvalidIds) {
    return {
      success: false,
      data: [],
      message: "Bad request: 'id' must be a valid UUID",
    };
  }

  return {
    success: true,
    data: { ids },
  };
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
  const data = {};
  let buffer;

  const type = formData.get("type");

  const date = new Date();
  const formatDate = DateTime.fromJSDate(date).setLocale("fr");
  const formatDateForName = formatDate.toFormat("ddMMMMyyyy");
  const formatDateForPath = formatDate.toFormat("yyyyMMdd");

  const count = await countUploadsByDisplayName(formatDateForName);
  const rank = count + 1;

  const dirPath = path.join("data", "uploads", formatDateForPath);
  const displayName = `${formatDateForName}-${type}-${rank}`;

  data.user_id = userId;
  data.date = date.toISOString();
  data.display_name = displayName;
  data.type = type;

  if (type === "file" || type === "api") {
    const file = formData.get("file");

    const fileName = file.name;
    const filePath = path.join(dirPath, `${rank} - ${type} - ${fileName}`);

    buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = calculateFileHash(buffer);

    data.file_name = fileName;
    data.file_path = filePath;
    data.file_hash = fileHash;
  } else {
    const source = formData.get("source");
    const object = formData.get("object");
    const summary = formData.get("summary");
    const documents = formData.getAll("documents");

    let dump = formData.get("dump");

    // construct data.json and fiche.docx
    // create a zipFile as buffer
    // calculate hash of the zipFile
    // suggest a fileName and path

    const fileName = `${formatDateForName}_formulaire.zip`;
    const filePath = path.join(dirPath, `${rank} - ${type} - ${fileName}`);
  }

  return { data, buffer };
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
