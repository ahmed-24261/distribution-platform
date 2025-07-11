import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getUploadById } from "@/lib/uploads";
import { validateGETRequest } from ".";
import { redis } from "@/lib/redis";

export const GET = async (request) => {
  try {
    const result = validateGETRequest(request);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const { id, task } = result.data;

    const { id: userId, permissions = [] } = await getUser();
    const canProcessAllUploads = permissions.includes(
      "CAN_PROCESS_ALL_UPLOADS"
    );
    const canProcessOwnUploads = permissions.includes(
      "CAN_PROCESS_OWN_UPLOADS"
    );

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

    if (task === "process") {
      if (canProcessAllUploads) {
      } else if (canProcessOwnUploads) {
      } else {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: "Forbidden: no Process access",
          },
          { status: 403 }
        );
      }
      if (!canProcessAllUploads && !canProcessOwnUploads) {
        return NextResponse.json(
          { success: false, data: null, message: "Forbidden: no  access" },
          { status: 403 }
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
      await redis.rPush("uploadsToBeProcessed", id);
    } else {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Bad request: unsupported task",
        },
        { status: 400 }
      );
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
