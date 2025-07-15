import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { deleteFailedFicheWhere } from "@/lib/failedFiches";

export const DELETE = async (request) => {
  try {
    const { searchParams } = new URL(request.url);

    const ids = searchParams.getAll("id");

    const { id: userId, permissions = [] } = await getUser();
    const canDeleteAllFiches = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const canDeleteOwnFiches = permissions.includes("CAN_DELETE_OWN_UPLOADS");

    const deletedFicheIds = [];
    const errors = [];
    for (const id of ids) {
      try {
        const where = { failed_fiches: {}, uploads: {} };

        if (canDeleteAllFiches) {
          where.failed_fiches.id = id;
        } else if (canDeleteOwnFiches) {
          where.failed_fiches.id = id;
          where.uploads.user_id = userId;
        } else {
          where.failed_fiches.id = [];
        }
        const ficheId = await deleteFailedFicheWhere(where);

        if (!ficheId) {
          errors.push({
            message: "Autorisations insuffisantes ou fiche échouée introuvable",
            status: 403,
          });

          continue;
        }

        deletedFicheIds.push(ficheId);
      } catch (e) {
        console.log(e);
        errors.push({ message: "Erreur interne du serveur", status: 500 });
      }
    }

    const total = ids.length;
    const deleted = deletedFicheIds.length;

    if (total === 1 && deleted === 0) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: errors[0].message,
        },
        { status: errors[0].status }
      );
    } else if (total > 1 && deleted === 0) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Suppression des fiches échouées a été échoué",
        },
        { status: 500 }
      );
    } else if (total !== deleted) {
      return NextResponse.json(
        {
          success: false,
          data: deletedFicheIds,
          message: `${deleted} sur ${total} fiches échouées ont été supprimées avec succès`,
        },
        { status: 500 }
      );
    } else if (total >= 1 && total === deleted) {
      return NextResponse.json(
        {
          success: true,
          data: deletedFicheIds,
          message:
            total === 1
              ? "Fiche échouée a été supprimée avec succès"
              : "Toutes les fiches échouées ont été supprimées avec succès",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Mauvaise requête",
        },
        { status: 400 }
      );
    }
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      {
        success: false,
        data: [],
        message: "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
};
