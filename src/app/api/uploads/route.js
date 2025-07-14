import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadsWhere,
  getUploadByFileHash,
  createUpload,
  getUploadById,
  deleteUploadWhere,
} from "@/lib/uploads";
import { validatePostRequest, constructPostData } from ".";

export const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    const { id: userId, permissions = [] } = await getUser();
    const canGetAllUploads = permissions.includes("CAN_GET_ALL_UPLOADS");
    const canGetOwnUploads = permissions.includes("CAN_GET_OWN_UPLOADS");

    const where = { uploads: {} };
    if (canGetAllUploads) {
      if (ids.length) where.uploads.id = ids;
    } else if (canGetOwnUploads) {
      if (ids.length) where.uploads.id = ids;
      where.uploads.user_id = userId;
    } else {
      where.uploads.id = [];
    }

    const uploads = await getUploadsWhere(where);
    return NextResponse.json(
      { success: true, data: uploads, message: null },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, data: [], message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};

export const POST = async (request) => {
  try {
    const result = await validatePostRequest(request);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const { formData } = result.data;

    const { id: userId, permissions = [] } = await getUser();
    const canCreateUpload = permissions.includes("CAN_CREATE_UPLOAD");

    if (!canCreateUpload) {
      return NextResponse.json(
        { success: false, data: null, message: "Autorisations insuffisantes" },
        { status: 403 }
      );
    }

    const { data, fileBuffer } = await constructPostData(formData, userId);

    const upload = await getUploadByFileHash(data.file_hash);
    if (upload) {
      return NextResponse.json(
        { success: false, data: null, message: "Téléversement existe déjà" },
        { status: 409 }
      );
    }

    const createdUpload = await createUpload(data, fileBuffer);
    return NextResponse.json(
      {
        success: true,
        data: createdUpload,
        message: "Téléversement a été ajouté avec succès",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};

export const DELETE = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const { id: userId, permissions = [] } = await getUser();
    const canDeleteAllUploads = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const canDeleteOwnUploads = permissions.includes("CAN_DELETE_OWN_UPLOADS");

    const upload = await getUploadById(id);
    if (!upload) {
      return NextResponse.json(
        { success: false, data: null, message: "Téléversement non trouvé" },
        { status: 404 }
      );
    }

    const { user_id: ownerId } = upload;
    if (!canDeleteAllUploads && (canDeleteOwnUploads || userId !== ownerId)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Autorisations insuffisantes",
        },
        { status: 403 }
      );
    }

    const where = { uploads: {} };
    if (canDeleteAllUploads) {
      where.uploads.id = id;
    } else if (canDeleteOwnUploads) {
      where.uploads.id = id;
      where.uploads.user_id = userId;
    }

    const uploadId = await deleteUploadWhere(where);
    if (!uploadId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: "Erreur lors de la suppression du téléversement",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: uploadId,
        message: "Téléversement a été supprimé avec succès",
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, data: null, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};
