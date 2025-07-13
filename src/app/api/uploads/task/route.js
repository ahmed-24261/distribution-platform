import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getUploadById } from "@/lib/uploads";
import { redis } from "@/lib/redis";

export const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const task = searchParams.get("task");

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
        { success: false, data: null, message: "Téléversement non trouvé." },
        { status: 404 }
      );
    }

    if (task === "process") {
      const { status, user_id: ownerId } = upload;

      if (
        !canProcessAllUploads &&
        (canProcessOwnUploads || userId !== ownerId)
      ) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: "Autorisations insuffisantes.",
          },
          { status: 403 }
        );
      }

      if (status !== "pending") {
        return NextResponse.json(
          { success: false, data: null, message: "Téléversement déjà traité." },
          { status: 400 }
        );
      }

      await redis.rPush("uploadsToBeProcessed", id);
      return NextResponse.json(
        { success: true, data: id, message: "Téléversement en traitement." },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, data: null, message: "Tâche non prise en charge." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, data: null, message: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
};
