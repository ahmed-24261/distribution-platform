import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getFicheOwnerId, updateFicheById, deleteFicheById } from "@/lib/fiche";

export const GET = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal server error: failed to fetch userId",
        },
        { status: 500 }
      );
    }

    const hasAllAccess = permissions.includes("CAN_GET_ALL_FICHES");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_FICHES");

    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no GET access" },
        { status: 403 }
      );
    }

    const validationResult = validateGetRequest(request);
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, data: [], message: validationResult.message },
        { status: 400 }
      );
    }

    const { ids } = validationResult.output;

    const where = {};
    if (ids.length) where.id = ids;
    if (!hasAllAccess) where.userId = userId;

    const getResponse = await getUploadsWhere(where);
    if (getResponse.ok) {
      return NextResponse.json(
        { success: true, data: getResponse.data, message: null },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal server error: failed to fetch uploads",
        },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, data: [], message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const PUT = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_UPDATE_ALL_FICHES");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_OWN_FICHES");

    const jsonData = await request.json();
    if (Array.isArray(jsonData)) {
      // Many fiches
      const updatedFicheIds = [];
      for (const item of jsonData) {
        const { id, update } = item || {};
        if (!id || !update) continue;

        const ownerId = await getFicheOwnerId(id);
        if (!hasAllAccess && (!hasOwnAccess || !ownerId || ownerId !== userId))
          continue;

        const ficheId = await updateFicheById(id, update);
        if (!ficheId) continue;
        updatedFicheIds.push(ficheId);
      }
      const total = jsonData.length;
      const updated = updatedFicheIds.length;

      if (updated === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to update all resources",
            data: [],
          },
          { status: 500 }
        );
      } else if (updated < total) {
        return NextResponse.json(
          {
            success: true,
            message: `${updated} out of ${total} resource(s) have been successfully updated`,
            data: updatedFicheIds,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            message: `All resources have been successfully updated`,
            data: updatedFicheIds,
          },
          { status: 200 }
        );
      }
    } else {
      // One fiche
      const { id, update } = jsonData || {};
      if (!id || !update) {
        return NextResponse.json(
          {
            success: false,
            message: "Bad request: 'id' and 'update' required",
            data: [],
          },
          { status: 400 }
        );
      }
      const ownerId = await getFicheOwnerId(id);
      if (!ownerId) {
        return NextResponse.json(
          {
            success: false,
            message: "Not found: Resource not exist",
            data: [],
          },
          { status: 404 }
        );
      }
      if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Forbidden: You do not have permission to update this resource",
            data: [],
          },
          { status: 403 }
        );
      }

      const ficheId = await updateFicheById(id, update);
      if (!ficheId) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to update resource",
            data: [],
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          success: true,
          message: "Resource was updated successfully",
          data: [ficheId],
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Une erreur interne est survenue.",
        data: [],
      },
      { status: 500 }
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

    if (ids.length > 1) {
      // Many fiches
      const deletedFicheIds = [];
      for (const id of ids) {
        if (!id) continue;

        const ownerId = await getFicheOwnerId(id);
        if (!hasAllAccess && (!hasOwnAccess || !ownerId || ownerId !== userId))
          continue;

        const ficheId = await deleteFicheById(id);
        if (!ficheId) continue;
        deletedFicheIds.push(ficheId);
      }
      const total = ids.length;
      const deleted = deletedFicheIds.length;

      if (deleted === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to delete all resources",
            data: [],
          },
          { status: 500 }
        );
      } else if (deleted < total) {
        return NextResponse.json(
          {
            success: true,
            message: `${deleted} out of ${total} resource(s) have been successfully deleted`,
            data: deletedFicheIds,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            message: `All resources have been successfully deleted`,
            data: deletedFicheIds,
          },
          { status: 200 }
        );
      }
    } else {
      // One fiche
      const id = ids[0];
      if (!id) {
        return NextResponse.json(
          {
            success: false,
            message: "Bad request: 'id' required",
            data: [],
          },
          { status: 400 }
        );
      }
      const ownerId = await getFicheOwnerId(id);
      if (!ownerId) {
        return NextResponse.json(
          {
            success: false,
            message: "Not found: Resource not exist",
            data: [],
          },
          { status: 404 }
        );
      }
      if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Forbidden: You do not have permission to delete this resource",
            data: [],
          },
          { status: 403 }
        );
      }

      const ficheId = await deleteFicheById(id);
      if (!ficheId) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to delete resource",
            data: [],
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          success: true,
          message: "Resource was deleted successfully",
          data: [ficheId],
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: [],
        message: "Erreur interne du serveur.",
      },
      { status: 500 }
    );
  }
};
