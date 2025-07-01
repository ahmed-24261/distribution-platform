import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadById,
  getUploadsWhere,
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

export const GET = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal server error: failed to fetch userId",
        },
        { status: 500 }
      );
    }

    const hasAllAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_UPLOADS");

    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no GET access" },
        { status: 403 }
      );
    }

    const validationResult = validateGetRequest(request);
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, data: [], message: validationResult.message },
        { status: 400 }
      );
    }

    const { ids } = validationResult.output;

    const where = {};
    if (ids.length) where.id = ids;
    if (!hasAllAccess) where.userId = userId;

    const getResponse = await getUploadsWhere(where);
    if (getResponse.ok) {
      return NextResponse.json(
        { success: true, data: getResponse.data, message: null },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal server error: failed to fetch uploads",
        },
        { status: 500 }
      );
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
