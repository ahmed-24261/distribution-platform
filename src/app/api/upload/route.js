import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadsWhere,
  getUploadPathsWhere,
  getUploadByHash,
  createUpload,
  deleteUpload,
} from "@/lib/upload";
import {
  validateGetRequest,
  validatePostRequest,
  constructPostData,
  validateDeleteRequest,
} from "./";
import path from "path";

export const GET = async (request) => {
  try {
    // Get user
    const { id: userId = null, permissions = [] } = await getUser();

    // Check permissions
    const hasAllGetAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnGetAccess = permissions.includes("CAN_GET_OWN_UPLOADS");
    const hasDownloadAccess = permissions.includes("CAN_DOWNLOAD_UPLOADS");
    if (!hasAllGetAccess && !hasOwnGetAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no Get access" },
        { status: 403 }
      );
    }

    // Validate request
    const { success, data, message } = validateGetRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    // Get data
    const { ids, download } = data;

    const where = {};
    if (ids.length) where.id = ids;
    if (!hasAllGetAccess) where.user_id = userId;

    if (!download) {
      const uploads = await getUploadsWhere(where);
      return NextResponse.json(
        { success: true, data: uploads, message: null },
        { status: 200 }
      );
    }

    if (!hasDownloadAccess) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Forbidden: no Download access",
        },
        { status: 403 }
      );
    }

    const uploadPaths = await getUploadPathsWhere(where);

    if (uploadPaths.length === 1) {
      const uploadPath = uploadPaths[0];
      const absPath = path.join(FILE_STORAGE_PATH, uploadPath);

      if (!fs.existsSync(absPath)) {
        return NextResponse.json(
          { data: null, message: "Not found: file not found" },
          { status: 404 }
        );
      }

      const fileBuffer = fs.readFileSync(absPath);
      const fileName = fileNameParam || path.basename(absPath);

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            fileName
          )}"`,
          "Content-Type": "application/octet-stream",
        },
      });
    } else {
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
      { success: false, data: [], message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const POST = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to fetch userId",
        },
        { status: 500 }
      );
    }

    const hasAccess = permissions.includes("CAN_CREATE_UPLOAD");

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, data: null, message: "Forbidden: no POST access" },
        { status: 403 }
      );
    }

    const validationResult = await validatePostRequest(request);
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, data: null, message: validationResult.message },
        { status: 400 }
      );
    }

    const { formData } = validationResult.output;

    const constructionResult = await constructPostData(formData, userId);
    if (!constructionResult) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to construct post data",
        },
        { status: 500 }
      );
    }

    const { uploadData, fileData } = constructionResult;

    const getResponse = await getUploadByHash(uploadData.hash);
    if (getResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Already Exists: upload already exist",
        },
        { status: 403 }
      );
    } else if (getResponse.error) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to check hash uniqueness",
        },
        { status: 500 }
      );
    }

    const createResponse = await createUpload(uploadData, fileData);
    if (createResponse.error) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to create upload",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: createResponse.data,
        message: "Upload created successfully",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to fetch userId",
        },
        { status: 500 }
      );
    }

    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_UPLOADS");

    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: null, message: "Forbidden: no DELETE access" },
        { status: 403 }
      );
    }

    const validationResult = await validateDeleteRequest(request);
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, data: null, message: validationResult.message },
        { status: 400 }
      );
    }
    const { id } = validationResult.output;

    const getResponse = await getUploadById(id);
    if (getResponse.error) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to fetch upload",
        },
        { status: 500 }
      );
    }
    if (getResponse.not_found) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Not found: upload not found",
        },
        { status: 404 }
      );
    }

    const { userId: ownerId } = getResponse.data;
    if (!hasAllAccess && userId !== ownerId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Forbidden: insufficient permissions",
        },
        { status: 403 }
      );
    }

    const deleteResponse = await deleteUpload(id);
    if (deleteResponse.ok) {
      return NextResponse.json(
        { success: true, data: id, message: "Upload deleted successfully" },
        { status: 200 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Internal server error: failed to delete upload",
      },
      { status: 500 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
};
