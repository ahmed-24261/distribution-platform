import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getFiche,
  getFichesWithDocumentsAndObservations,
  updateFiche,
  deleteFiche,
} from "@/lib/fiche";
import {
  validateGetRequest,
  validatePutRequest,
  validateDeleteRequest,
} from ".";

export const GET = async (request) => {
  try {
    // Get user
    const { id: userId, role, permissions = [] } = await getUser();
    const isAdmin = ["admin", "superAdmin"].includes(role);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal Server Error: failed to get user",
        },
        { status: 500 }
      );
    }

    // Check permissions
    const hasAccess = permissions.includes("CAN_GET_FICHES");
    if (!hasAccess) {
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

    const { ids, getFile } = validationResult.data;
    const getResponse = await getFichesWithDocumentsAndObservations(
      ids,
      userId,
      { isAdmin }
    );
    if (!getResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal Server Error: failed to fetch fiches",
        },
        { status: 500 }
      );
    }

    if (!getFile) {
      return NextResponse.json(
        { success: true, data: getResponse.data, message: null },
        { status: 200 }
      );
    }
    const fiche = getResponse.data[0];
    if (fiche) {
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, data: [], message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

export const PUT = async (request) => {
  try {
    // Get user
    const { id: userId, permissions = [] } = await getUser();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal Server Error: failed to get user",
        },
        { status: 500 }
      );
    }

    // Check permissions
    const hasAllAccess = permissions.includes("CAN_UPDATE_ALL_FICHES");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_OWN_FICHES");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no UPDATE access" },
        { status: 403 }
      );
    }

    // Validate the request
    const validationResult = await validatePutRequest(request);
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, data: [], message: validationResult.message },
        { status: 400 }
      );
    }

    const { items } = validationResult.data;

    const updatedFicheIds = [];
    const errors = [];

    for (const item of items) {
      const { id, update } = item;

      const getResponse = await getFiche(id);
      if (getResponse.error) {
        errors.push({
          id,
          message: "Internal Server Error: failed to get fiche",
          status: 500,
        });
        continue;
      } else if (getResponse.not_found) {
        errors.push({
          id,
          message: "Not found: fiche not found",
          status: 404,
        });
        continue;
      }

      const { userId: ownerId } = getResponse.data;
      if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) {
        errors.push({
          id,
          message: "Forbidden: not allowed to update fiche",
          status: 403,
        });
        continue;
      }

      const updateResponse = await updateFiche(id, update);
      if (updateResponse.error) {
        errors.push({
          id,
          message: "Internal Server Error: failed to update fiche",
          status: 500,
        });
        continue;
      }
      updatedFicheIds.push(ficheId);
    }

    const total = items.length;
    const updated = updatedFicheIds.length;

    if (total === 1) {
      if (total !== updated) {
        const error = errors[0];
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: error.message,
          },
          { status: error.status }
        );
      }
      return NextResponse.json(
        {
          success: true,
          data: updatedFicheIds,
          message: "Fiche was updated successfully",
        },
        { status: 200 }
      );
    } else {
      if (updated === 0) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Internal Server Error: failed to update all fiches",
          },
          { status: 500 }
        );
      } else if (updated < total) {
        return NextResponse.json(
          {
            success: true,
            data: updatedFicheIds,
            message: `${updated} out of ${total} resources have been successfully updated`,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            data: updatedFicheIds,
            message: `All resources have been successfully updated`,
          },
          { status: 200 }
        );
      }
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: [],
        message: "Internal error server",
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (request) => {
  try {
    // Get user
    const { id: userId, permissions = [] } = await getUser();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          message: "Internal Server Error: failed to get user",
        },
        { status: 500 }
      );
    }

    // Check permissions
    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_FICHES");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_FICHES");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no DELETE access" },
        { status: 403 }
      );
    }

    // Validate the request
    const validationResult = validateDeleteRequest(request);
    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, data: [], message: validationResult.message },
        { status: 400 }
      );
    }

    const { ids } = validationResult.data;

    const deletedFicheIds = [];
    const errors = [];

    for (const id of ids) {
      const getResponse = await getFiche(id);
      if (getResponse.error) {
        errors.push({
          id,
          message: "Internal Server Error: failed to get fiche",
          status: 500,
        });
        continue;
      } else if (getResponse.not_found) {
        errors.push({
          id,
          message: "Not found: fiche not found",
          status: 404,
        });
        continue;
      }

      const { userId: ownerId } = getResponse.data;
      if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) {
        errors.push({
          id,
          message: "Forbidden: not allowed to delete fiche",
          status: 403,
        });
        continue;
      }

      const deleteResponse = await deleteFiche(id);
      if (deleteResponse.error) {
        errors.push({
          id,
          message: "Internal Server Error: failed to delete fiche",
          status: 500,
        });
        continue;
      }
      deletedFicheIds.push(id);
    }

    const total = ids.length;
    const deleted = deletedFicheIds.length;

    if (total === 1) {
      if (total !== deleted) {
        const error = errors[0];
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: error.message,
          },
          { status: error.status }
        );
      }
      return NextResponse.json(
        {
          success: true,
          data: ids,
          message: "Fiche was deleted successfully",
        },
        { status: 200 }
      );
    } else {
      if (deleted === 0) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Internal Server Error: failed to delete all fiches",
          },
          { status: 500 }
        );
      } else if (deleted < total) {
        return NextResponse.json(
          {
            success: true,
            data: deletedFicheIds,
            message: `${deleted} out of ${total} resources have been successfully deleted`,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            data: deletedFicheIds,
            message: `All resources have been successfully deleted`,
          },
          { status: 200 }
        );
      }
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: [],
        message: "Internal Server Error",
      },
      { status: 500 }
    );
  }
};
