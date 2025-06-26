import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadOwnerId,
  getUploadsWhere,
  getUploadByHash,
  createUpload,
  deleteUpload,
} from "@/lib/upload";
import { validatePostData, constructPostData } from "./";
import validate from "uuid-validate";

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

    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    const validateIds = ids.every((id) => validate(id, 4));
    if (!validateIds) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Bad request: 'id' should be a valid uuid",
        },
        { status: 400 }
      );
    }

    const where = {};
    if (ids.length) where.id = ids;
    if (!hasAllAccess) where.userId = userId;

    const response = await getUploadsWhere(where);

    if (response.ok) {
      return NextResponse.json(
        { success: true, data: response.data, message: null },
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

    const formData = await request.formData();

    const { valid, message } = await validatePostData(formData);
    if (!valid) {
      return NextResponse.json(
        { success: false, data: null, message },
        { status: 400 }
      );
    }

    const result = await constructPostData(formData, userId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to construct post data",
        },
        { status: 500 }
      );
    }

    const { uploadData, fileData } = result;

    const response = await getUploadByHash(uploadData.hash);
    if (response.ok) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Already Exists: upload already exist",
        },
        { status: 403 }
      );
    } else if (response.error) {
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
  } catch (error) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const validateId = validate(id, 4);
    if (!validateId) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Bad request: 'id' should be a valid uuid",
        },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Bad request: 'id' required",
        },
        { status: 400 }
      );
    }

    const response = await getUploadOwnerId(id);
    if (response.error) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Internal server error: failed to fetch upload owner",
        },
        { status: 500 }
      );
    }
    if (response.not_found) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Not found: upload not found",
        },
        { status: 404 }
      );
    }

    const { ownerId } = response;
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
