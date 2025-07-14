import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getFichesWhere,
  updateFicheWhere,
  deleteFicheWhere,
} from "@/lib/fiches";

export const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("id");

    const { id: userId, role, permissions = [] } = await getUser();
    const canGetFiches = permissions.includes("CAN_GET_FICHES");

    const where = { fiches: {}, users: {} };
    if (canGetFiches) {
      if (ids.length) where.fiches.id = ids;
      if (role === "user") {
        where.fiches.status = "valid";
        where.users.id = userId;
      }
    } else {
      where.fiches.id = [];
    }

    const fiches = await getFichesWhere(where);
    return NextResponse.json(
      { success: true, data: fiches, message: null },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, data: [], message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
};

export const PUT = async (request) => {
  try {
    const jsonData = await request.json();

    const { id: userId, permissions = [] } = await getUser();
    const canUpdateAllFiches = permissions.includes("CAN_UPDATE_ALL_FICHES");
    const canUpdateOwnFiches = permissions.includes("CAN_UPDATE_OWN_FICHES");

    const updatedFicheIds = [];
    const errors = [];
    for (const data of jsonData) {
      try {
        const id = data?.id;
        const update = data?.update;

        const where = { fiches: {}, users: {} };
        if (canUpdateAllFiches) {
          where.fiches.id = id;
        } else if (canUpdateOwnFiches) {
          where.fiches.id = id;
          where.users.id = userId;
        } else {
          where.fiches.id = null;
        }

        const ficheId = await updateFicheWhere(where, update);

        if (!ficheId) {
          errors.push({
            message: "Autorisations insuffisantes ou fiche introuvable",
            status: 403,
          });

          continue;
        }

        updatedFicheIds.push(ficheId);
      } catch {
        errors.push({ message: "Erreur interne du serveur", status: 500 });
      }
    }

    const total = jsonData.length;
    const updated = updatedFicheIds.length;

    if (total === 1 && updated === 0) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: errors[0].message,
        },
        { status: errors[0].status }
      );
    } else if (total > 1 && updated === 0) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Mettre à jour des fiches a échoué",
        },
        { status: 500 }
      );
    } else if (total !== updated) {
      return NextResponse.json(
        {
          success: false,
          data: updatedFicheIds,
          message: `${updated} sur ${total} fiches ont été mettre à jour avec succès`,
        },
        { status: 500 }
      );
    } else if (total >= 1 && total === updated) {
      return NextResponse.json(
        {
          success: true,
          data: updatedFicheIds,
          message:
            total === 1
              ? "Fiche a été mise à jour avec succès"
              : "Toutes les fiches ont été mises à jour avec succès",
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
  } catch {
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

export const DELETE = async (request) => {
  try {
    const { searchParams } = new URL(request.url);

    const ids = searchParams.getAll("id");

    const { id: userId, permissions = [] } = await getUser();
    const canDeleteAllFiches = permissions.includes("CAN_DELETE_ALL_FICHES");
    const canDeleteOwnFiches = permissions.includes("CAN_DELETE_OWN_FICHES");

    const deletedFicheIds = [];
    const errors = [];
    for (const id of ids) {
      try {
        const where = { fiches: {}, uploads: {} };
        if (canDeleteAllFiches) {
          where.fiches.id = id;
        } else if (canDeleteOwnFiches) {
          where.fiches.id = id;
          where.uploads.user_id = userId;
        } else {
          where.fiches.id = null;
        }

        const ficheId = await deleteFicheWhere(where);

        if (!ficheId) {
          errors.push({
            message: "Autorisations insuffisantes ou fiche introuvable",
            status: 403,
          });

          continue;
        }

        deletedFicheIds.push(ficheId);
      } catch {
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
          message: "Suppression des fiches a échoué",
        },
        { status: 500 }
      );
    } else if (total !== deleted) {
      return NextResponse.json(
        {
          success: false,
          data: deletedFicheIds,
          message: `${deleted} sur ${total} fiches ont été supprimées avec succès`,
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
              ? "Fiche a été supprimée avec succès"
              : "Toutes les fiches ont supprimées avec succès",
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
  } catch {
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
