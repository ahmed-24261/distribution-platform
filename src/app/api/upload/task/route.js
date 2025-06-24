import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getUploadByIdWithUser } from "@/lib/upload";
import { HTTPError } from "@/lib/utils";
import { redis } from "@/lib/redis";

export const POST = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_UPDATE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_OWN_UPLOADS");

    const jsonData = await request.json();
    const { id, task } = jsonData;

    if (!hasAllAccess && !hasOwnAccess) {
      throw new HTTPError("Unauthorized: no UPDATE access", 403);
    }

    if (!id || !task) {
      throw new HTTPError("Bad request: id and task required", 400);
    }

    const upload = await getUploadByIdWithUser(id);
    if (!upload) {
      throw new HTTPError("Bad request: invalid id", 400);
    }

    if (!hasAllAccess && userId !== upload.user_id) {
      throw new HTTPError("Unauthorized: insufficient permissions", 403);
    }

    if (task === "process") {
      await redis.rPush("uploadsToProcess", id);
    } else {
      throw new HTTPError("Bad request: invalid task", 400);
    }

    return NextResponse.json(
      { success: true, data: id, message: "Traitement du fichier en cours..." },
      { status: 200 }
    );
  } catch (error) {
    const isHTTPError = error instanceof HTTPError;
    const message = isHTTPError
      ? error.getMessage()
      : "Erreur interne du serveur";
    const status = isHTTPError ? error.getStatus() : 500;

    return NextResponse.json(
      { success: false, data: null, message },
      { status }
    );
  }
};
