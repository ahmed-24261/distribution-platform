import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadsById,
  getUploadsByIdAndUserId,
  getAllUploads,
  getUploadsByUserId,
  getUploadByHash,
  createUploadTransaction,
  deleteUploadTransaction,
} from "@/lib/upload";
import { validatePostData, constructPostData } from "@/lib/api/upload";

export const GET = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_UPLOADS");

    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    let uploads;
    if (hasAllAccess) {
      uploads = ids.length ? await getUploadsById(ids) : await getAllUploads();
    } else if (hasOwnAccess) {
      uploads = ids.length
        ? await getUploadsByIdAndUserId(ids, userId)
        : await getUploadsByUserId(userId);
    } else {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized: no upload access" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: uploads, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    );
  }
};

export const POST = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAccess = permissions.includes("CAN_CREATE_UPLOAD");

    const formData = await request.formData();

    if (hasAccess) {
      const { valid, message } = await validatePostData(formData);
      if (!valid) {
        return NextResponse.json(
          { data: null, error: { message } },
          { status: 400 }
        );
      }

      const { data, fileData } = await constructPostData(formData, userId);

      const exist = await getUploadByHash(data.hash);
      if (exist) {
        return NextResponse.json(
          { data: null, error: { message: "Upload already exists" } },
          { status: 409 }
        );
      }

      const uploadId = await createUploadTransaction(data, fileData);

      return NextResponse.json(
        { data: uploadId, error: null },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized: no upload access" } },
        { status: 403 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    );
  }
};

export const PUT = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_UPDATE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_OWN_UPLOADS");

    const jsonData = await request.json();

    // validate data
    // validatePutData(jsonData);

    if (hasAllAccess) {
    } else if (hasOwnAccess) {
    } else {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized: no update access" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: "PUT request",
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    );
  }
};

export const DELETE = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_UPLOADS");

    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    if (!ids.length) {
      return NextResponse.json(
        { data: null, error: { message: "No IDs provided for deletion" } },
        { status: 400 }
      );
    }

    const deletedIds = [];
    if (hasAllAccess) {
      for (const id of ids) {
        const deletedUploadId = await deleteUploadTransaction(id);
        if (deletedUploadId) deletedIds.push(deletedUploadId);
      }
    } else if (hasOwnAccess) {
      const ownUploads = await getUploadsByIdAndUserId(ids, userId);
      const ownUploadIds = ownUploads.map((upload) => upload.id);
      for (const id of ownUploadIds) {
        const deletedUploadId = await deleteUploadTransaction(id);
        if (deletedUploadId) deletedIds.push(deletedUploadId);
      }
    } else {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized: no delete access" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: deletedIds,
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      { status: 500 }
    );
  }
};
