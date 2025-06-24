import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getFicheWithUserId, deleteFicheTransaction } from "@/lib/fiche";

export const PUT = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_UPDATE_FICHES");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_FICHES");

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

    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_FICHES");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_FICHES");

    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Non autorisé: pas d'accès SUPPRESSION",
        },
        { status: 403 }
      );
    }

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Requête invalide: 'id' est requis",
        },
        { status: 400 }
      );
    }

    const deletedFicheIds = [];
    for (const id of ids) {
      try {
        const fiche = await getFicheWithUserId(id);

        if (fiche && (hasAllAccess || userId === fiche.userId)) {
          await deleteFicheTransaction(id);
          deletedFicheIds.push(id);
        }
      } catch {}
    }

    const fichesCount = ids.length;
    const deletionCount = deletedFicheIds.length;
    const isSingle = fichesCount === 1;

    if (deletionCount === 0) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: isSingle
            ? "Impossible de supprimer la fiche."
            : "Impossible de supprimer les fiches.",
        },
        { status: 500 }
      );
    } else if (deletionCount < fichesCount) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          message: `Seules ${deletionCount} sur ${fichesCount} fiches ont été supprimées.`,
        },
        { status: 207 }
      );
    } else {
      return NextResponse.json(
        {
          success: true,
          data: deletedFicheIds,
          message: isSingle
            ? "La fiche a été supprimée avec succès."
            : "Toutes les fiches ont été supprimées avec succès.",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, data: [], message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};
