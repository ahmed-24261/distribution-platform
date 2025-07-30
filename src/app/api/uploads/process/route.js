import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getUploadByIdWithProcess } from "@/lib/uploads";
import { redis } from "@/lib/redis";
import { v4 as UUID } from "uuid";

export const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    const { id: userId, permissions = [] } = await getUser();
    const canProcessAllUploads = permissions.includes(
      "CAN_PROCESS_ALL_UPLOADS"
    );
    const canProcessOwnUploads = permissions.includes(
      "CAN_PROCESS_OWN_UPLOADS"
    );

    const upload = await getUploadByIdWithProcess(id);
    if (!upload) {
      return NextResponse.json(
        { success: false, data: null, message: "Téléversement introuvable" },
        { status: 404 }
      );
    }

    const isNotAllowed =
      !canProcessAllUploads &&
      (!canProcessOwnUploads || upload.user_id !== userId);

    if (isNotAllowed) {
      return NextResponse.json(
        { success: false, data: null, message: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    if (upload?.process?.status && upload?.process?.status !== "failed") {
      return NextResponse.json(
        { success: false, data: null, message: "Téléversement déjà traité" },
        { status: 409 }
      );
    }

    const maxAttempt = 5;
    const attempt = upload?.process?.attempt || 0;
    if (attempt >= maxAttempt) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Trop d'essais, téléversez à nouveau",
        },
        { status: 409 }
      );
    }

    const task = {
      taskId: UUID(),
      upload_id: upload.id,
      user_id: userId,
      attempt: attempt + 1,
    };

    await redis.rPush("processQueue", JSON.stringify(task));

    const sub = redis.duplicate();
    await sub.connect();

    const process = await new Promise((resolve) => {
      sub.subscribe(task.taskId, (message) => {
        sub.unsubscribe(task.taskId);
        resolve(JSON.parse(message));
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: { id, process },
        message: "Téléversement traité avec succès",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};
