import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getUploadById } from "@/lib/upload";
import { validatePostRequest } from "./";
import { redis } from "@/lib/redis";

export const POST = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_UPDATE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_OWN_UPLOADS");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: null, message: "Forbidden: no UPDATE access" },
        { status: 403 }
      );
    }

    const { success, data, message } = await validatePostRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { id, task } = data;

    const upload = await getUploadById(id);
    if (!upload) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Not found: upload not found",
        },
        { status: 404 }
      );
    }

    const { status, user_id: ownerId } = upload;

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
    if (status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Bad request: upload already processed",
        },
        { status: 400 }
      );
    }

    if (task === "process") {
      await redis.rPush("uploadsToProcess", id);
    }

    return NextResponse.json(
      { success: true, data: id, message: "Task started ..." },
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
