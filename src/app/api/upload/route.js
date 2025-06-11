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
  updateUploadStatusById,
  getUploadByIdWithUser,
} from "@/lib/upload";
import { validatePostData, constructPostData } from "@/lib/api/upload";
import { HTTPError } from "@/lib/utils";
import { redis } from "@/lib/redis";
import { consoleLog } from "../../../../consoleLog";

export const GET = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_UPLOADS");

    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    let records;
    if (hasAllAccess) {
      records = ids.length ? await getUploadsById(ids) : await getAllUploads();
    } else if (hasOwnAccess) {
      records = ids.length
        ? await getUploadsByIdAndUserId(ids, userId)
        : await getUploadsByUserId(userId);
    } else {
      throw new HTTPError("Unauthorized: no upload access", 403);
    }

    return NextResponse.json({ data: records, error: null }, { status: 200 });
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError ? error.getMessage() : "Internal server error";
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json({ data: null, error: { message } }, { status });
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
      if (exist) throw new HTTPError("Record already exists", 40);

      const uploadId = await createUploadTransaction(recordData, fileData);

      return NextResponse.json(
        { data: uploadId, error: null },
        { status: 201 }
      );
    } else {
      throw new HTTPError("Unauthorized: no upload access", 403);
    }
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError ? error.getMessage() : "Internal server error";
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json({ data: null, error: { message } }, { status });
  }
};

export const PUT = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_UPDATE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_OWN_UPLOADS");

    consoleLog("permissions:\n" + permissions.join("\n"), "yellow");

    const jsonData = await request.json();
    const { id } = jsonData;

    if (!hasAllAccess && !hasOwnAccess) {
      throw new HTTPError("Unauthorized: no UPDATE access", 403);
    }

    if (!id) {
      throw new HTTPError("Bad request: id required", 400);
    }

    const upload = await getUploadByIdWithUser(id);
    if (!upload) {
      throw new HTTPError("Bad request: invalid id", 400);
    }
    if (upload.status !== "pending") {
      // throw new HTTPError("Upload already processed", 400);
    }

    if (!hasAllAccess && userId !== upload.user_id) {
      throw new HTTPError("Unauthorized: insufficient permissions", 403);
    }

    await updateUploadStatusById(id, "processing");
    await redis.rPush("uploadsToProcess", id);

    return NextResponse.json({ data: id, error: null }, { status: 200 });
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError ? error.getMessage() : "Internal server error";
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json({ data: null, error: { message } }, { status });
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
      throw new HTTPError("Bad request: id required", 400);
    }
    if (!hasAllAccess && !hasOwnAccess) {
      throw new HTTPError("Unauthorized: no DELETE access", 403);
    }

    const data = [];
    const error = [];
    if (hasAllAccess) {
      for (const id of ids) {
        await deleteUploadTransaction(id)
          .then((id) => {
            data.push(id);
          })
          .catch((error) => {
            const message =
              error instanceof HTTPError
                ? error.getMessage()
                : "Internal server error";
            error.push({ id, message });
          });
      }
    } else if (hasOwnAccess) {
      const ownRecordes = await getUploadsByIdAndUserId(ids, userId);
      const ownRecordIds = ownRecordes.map((upload) => upload.id);
      for (const id of ids) {
        if (!ownRecordIds.includes(id)) {
          error.push({ id, message: "No access to record" });
          continue;
        }
        await deleteUploadTransaction(id)
          .then((id) => {
            data.push(id);
          })
          .catch((error) => {
            const message =
              error instanceof HTTPError
                ? error.getMessage()
                : "Internal server error";
            error.push({ id, message });
          });
      }
    }

    return NextResponse.json(
      { data, error: error.length ? error : null },
      { status: 200 }
    );
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError ? error.getMessage() : "Internal server error";
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json({ data: null, error: { message } }, { status });
  }
};
