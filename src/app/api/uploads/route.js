import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadsWhere,
  getUploadByHash,
  createUpload,
  deleteUpload,
} from "@/lib/uploads";
import {
  validateGetRequest,
  validatePostRequest,
  constructUploadData,
  validateDeleteRequest,
} from ".";

export const GET = async (request) => {
  try {
    const result = validateGetRequest(request);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const { ids } = result.data;

    const { id: userId, permissions = [] } = await getUser();
    const hasAllAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_UPLOADS");

    const where = {};
    if (hasAllAccess) {
      if (ids.length) where.uploads = { id: ids };
    } else if (hasOwnAccess) {
      if (ids.length) where.uploads = { id: ids };
      where.users = { id: userId };
    } else {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no Get access" },
        { status: 403 }
      );
    }

    const uploads = await getUploadsWhere(where);
    return NextResponse.json(
      { success: true, data: uploads, message: null },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, data: [], message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const POST = async (request) => {
  try {
    const result = await validatePostRequest(request);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const { formData } = result.data;

    const { id: userId, permissions = [] } = await getUser();
    const hasAccess = permissions.includes("CAN_CREATE_UPLOAD");

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, data: null, message: "Forbidden: no Create access" },
        { status: 403 }
      );
    }

    const { data, buffer } = await constructUploadData(formData, userId);

    const upload = await getUploadByHash(data.file_hash);
    if (upload) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Already Exists: upload already exist",
        },
        { status: 409 }
      );
    }

    const uploadId = await createUpload(data, buffer);
    return NextResponse.json(
      {
        success: true,
        data: uploadId,
        message: "Upload created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/uploads:", error);
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
      {
        success: true,
        data: deletedUploadId,
        message: "Upload deleted successfully",
      },
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
