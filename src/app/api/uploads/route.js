import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getUploadsWithAllWhere,
  getUploadById,
  getUploadByFileHash,
  createUpload,
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

    const uploads = await getUploadsWithAllWhere(where);
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
        { success: false, data: null, message: "Permissions insuffisantes" },
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
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { success: false, data: null, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};

export const DELETE = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    const { id: userId, permissions = [] } = await getUser();
    const canDeleteAllUploads = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const canDeleteOwnUploads = permissions.includes("CAN_DELETE_OWN_UPLOADS");

    if (ids.length === 1) {
      const upload = await getUploadById(ids[0]);
      if (!upload) {
        return NextResponse.json(
          { success: false, data: [], message: "Téléversement introuvable" },
          { status: 404 }
        );
      }

      const isNotAllowed =
        !canDeleteAllUploads &&
        (!canDeleteOwnUploads || upload.user_id !== userId);

      if (isNotAllowed) {
        return NextResponse.json(
          { success: false, data: [], message: "Permissions insuffisantes" },
          { status: 403 }
        );
      }

      const where = { uploads: { id: ids[0] } };
      const deletedUploadId = await deleteUploadWhere(where);

      return NextResponse.json(
        {
          success: true,
          data: [deletedUploadId],
          message: "Téléversement supprimé avec succès",
        },
        { status: 200 }
      );
    }

    const deletedUploadIds = [];
    for (const id of ids) {
      const where = { uploads: {} };
      if (canDeleteAllUploads) {
        where.uploads.id = id;
      } else if (canDeleteOwnUploads) {
        where.uploads.id = id;
        where.uploads.user_id = userId;
      } else {
        where.uploads.id = null;
      }
      await deleteUploadWhere(where)
        .then((id) => {
          if (id) deletedUploadIds.push(id);
        })
        .catch(() => null);
    }

    let message, status;
    if (deletedUploadIds.length === ids.length) {
      message = "Tous les téléversements ont été supprimés avec succès";
      status = 200;
    } else if (deletedUploadIds.length === 0) {
      message = "Aucun téléversement n'a été supprimé";
      status = 404;
    } else {
      message = "Certains téléversements ont été supprimés avec succès";
      status = 200;
    }

    return NextResponse.json(
      { success: true, data: deletedUploadIds, message },
      { status }
    );
  } catch {
    return NextResponse.json(
      { success: false, data: [], message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};
