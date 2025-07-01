import path from "path";
import { DateTime } from "luxon";
import { calculateFileHash } from "@/lib/utils";
import { countUploadsWhereDisplayNameLike, getUploadById } from "@/lib/upload";
import validate from "uuid-validate";

// --- GET request
export const validateGetRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.getAll("id");

  const validateIds = ids.every((id) => validate(id, 4));
  if (!validateIds) {
    return {
      valid: false,
      message: "Bad request: 'id' should be a valid uuid",
    };
  }

  return { valid: true, output: { ids } };
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

    console.log("type: ", type);
    console.log("file: ", file?.type);
    if (!file || !validFile) {
      return {
        valid: false,
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
        valid: false,
        message: "Bad request: 'source' is required",
      };
    }
    if (!object) {
      return {
        valid: false,
        message: "Bad request: 'object' is required",
      };
    }
    if (!summary) {
      return {
        valid: false,
        message: "Bad request: 'summary' is required",
      };
    }
    if (documents.length === 0) {
      return {
        valid: false,
        message: "Bad request: At least one source document is required",
      };
    }
    for (const document of documents) {
      const type = document.get("type");
      const file = document.get("file");
      const message = document.get("message");
      if (!type || !["File", "Message", "Attachment"].includes(type)) {
        return {
          valid: false,
          message: "Bad request: Invalid document type",
        };
      }
      if (!file) {
        return {
          valid: false,
          message: "Bad request: Document file is required",
        };
      }
      if (type === "Attachment" && !message) {
        return {
          valid: false,
          message: "Bad request: Message is required for attachments",
        };
      }
    }
  } else {
    return {
      valid: false,
      message: "Bad request: Invalid type",
    };
  }

  return { valid: true, output: { formData } };
};

export const constructPostData = async (formData, userId) => {
  try {
    const type = formData.get("type");

    const uploadData = { userId, type };

    let fileData;

    const date = new Date("2022-12-14");
    const formatDate = DateTime.fromJSDate(date).setLocale("fr");
    const formatDateForName = formatDate.toFormat("ddMMMMyyyy");
    const formatDateForPath = formatDate.toFormat("yyyyMMdd");

    const countResponse = await countUploadsWhereDisplayNameLike(
      formatDateForName
    );
    if (countResponse.error) return null;

    const rank = countResponse.data + 1;

    const dirPath = path.join("data", "uploads", formatDateForPath);

    const displayName = `${formatDateForName}-${type}-${rank}`;

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
  } catch {
    return null;
  }
};

// --- DELETE request
export const validateDeleteRequest = async (request) => {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");

  if (!id) {
    return {
      valid: false,
      message: "Bad request: 'id' required",
    };
  }

  const validateId = validate(id, 4);
  if (!validateId) {
    return {
      valid: false,
      message: "Bad request: 'id' should be a valid uuid",
    };
  }

  return { valid: true, output: { id } };
};
