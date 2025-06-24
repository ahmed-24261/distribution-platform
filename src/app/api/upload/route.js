import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadByIdWithUser,
  getUploadsWhere,
  getUploadByHash,
  createUploadTransaction,
  deleteUploadTransaction,
} from "@/lib/upload";
import { validatePostData, constructPostData } from "@/lib/api/upload";
import { HTTPError } from "@/lib/utils";

export const GET = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_UPLOADS");

    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    let records;
    if (hasAllAccess) {
      records = ids.length
        ? await getUploadsWhere({ id: ids })
        : await getUploadsWhere();
    } else if (hasOwnAccess) {
      records = ids.length
        ? await getUploadsWhere({ id: ids, user_id: userId })
        : await getUploadsWhere({ user_id: userId });
    } else {
      throw new HTTPError("Unauthorized: no upload access", 403);
    }

    return NextResponse.json(
      { success: true, data: records, message: null },
      { status: 200 }
    );
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError ? error.getMessage() : "Internal server error";
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json(
      { success: false, data: null, message },
      { status }
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
      if (!valid) throw new HTTPError(message, 400);

      const { recordData, fileData } = await constructPostData(
        formData,
        userId
      );

      const exist = await getUploadByHash(recordData.hash);
      if (exist) throw new HTTPError("Record already exists", 400);

      const uploadId = await createUploadTransaction(recordData, fileData);

      return NextResponse.json(
        {
          success: true,
          data: uploadId,
          message: "Téléversement est ajouté avec succès",
        },
        { status: 201 }
      );
    } else {
      throw new HTTPError("Unauthorized: no upload access", 403);
    }
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError ? error.getMessage() : "Internal server error";
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json(
      { success: false, data: null, message },
      { status }
    );
  }
};

export const DELETE = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_UPLOADS");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!hasAllAccess && !hasOwnAccess) {
      throw new HTTPError("Unauthorized: no DELETE access", 403);
    }

    if (!id) {
      throw new HTTPError("Bad request: id required", 400);
    }

    const upload = await getUploadByIdWithUser(id);
    if (!upload) {
      throw new HTTPError("Bad request: invalid id", 400);
    }

    if (!hasAllAccess && userId !== upload.user_id) {
      throw new HTTPError("Unauthorized: insufficient permissions", 403);
    }

    await deleteUploadTransaction(id);

    return NextResponse.json(
      { success: true, data: id, message: "Téléversement est supprimé" },
      { status: 200 }
    );
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError
      ? error.getMessage()
      : "Erreur interne du serveur" + error.message;
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json(
      { success: false, data: null, message },
      { status }
    );
  }
};
