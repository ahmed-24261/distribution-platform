import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadsById,
  getUploadsByIdAndUserId,
  getAllUploads,
  getUploadsByUserId,
} from "@/lib/upload";
import { validateData, createUpload } from "@/lib/api/upload";
import { consoleLog } from "../../../../consoleLog";

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
      {
        status: 500,
      }
    );
  }
};

export const POST = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAccess = permissions.includes("CAN_CREATE_UPLOAD");

    const formData = await request.formData();

    consoleLog("permissions:\n" + permissions.join("\n"), "yellow");

    if (hasAccess) {
      const { valid, message } = await validateData(formData);
      if (!valid) {
        return NextResponse.json(
          { data: null, error: { message } },
          { status: 400 }
        );
      }
      const uploadId = await createUpload(formData, userId);
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

    return NextResponse.json({ data: "Done", error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message } },
      {
        status: 500,
      }
    );
  }
};
