import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadsWhere,
  getUploadPathsAndFileNamesWhere,
  getUploadByHash,
  createUpload,
  deleteUpload,
} from "@/lib/upload";
import {
  validateGetRequest,
  validatePostRequest,
  constructPostData,
  validateDeleteRequest,
  createFileBuffer,
} from "./";

export const GET = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_UPLOADS");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no Get access" },
        { status: 403 }
      );
    }

    const { success, data, message } = validateGetRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { ids, download } = data;

    const where = {};
    if (ids.length) where.id = ids;
    if (!hasAllAccess) where.user_id = userId;

    if (!download) {
      const uploads = await getUploadsWhere(where);
      return NextResponse.json(
        { success: true, data: uploads, message: null },
        { status: 200 }
      );
    }

    const uploads = await getUploadPathsAndFileNamesWhere(where);
    const { fileBuffer, fileName } = await createFileBuffer(uploads);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { success: false, data: [], message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const POST = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAccess = permissions.includes("CAN_CREATE_UPLOAD");
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, data: null, message: "Forbidden: no POST access" },
        { status: 403 }
      );
    }

    const { success, data, message } = await validatePostRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { formData } = data;

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

    const upload = await getUploadByHash(uploadData.hash);
    if (upload) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Already Exists: upload already exist",
        },
        { status: 403 }
      );
    }

    const createdUploadId = await createUpload(uploadData, fileData);

    return NextResponse.json(
      {
        success: true,
        data: createdUploadId,
        message: "Upload created successfully",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_UPLOADS");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: null, message: "Forbidden: no DELETE access" },
        { status: 403 }
      );
    }

    const { success, data, message } = await validateDeleteRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { id } = data;
    const ownerId = !hasAllAccess ? userId : null;

    const deletedUploadId = await deleteUpload(id, ownerId);
    if (!deletedUploadId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Forbidden: insufficient permissions Or upload not found",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: true, data: id, message: "Upload deleted successfully" },
      { status: 200 }
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
