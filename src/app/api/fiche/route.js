import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import {
  getFichesForConsumption,
  getFiches,
  getOwnerFicheById,
  updateFiche,
  deleteFiche,
} from "@/lib/fiche";
import {
  validateGetRequest,
  createFileBuffer,
  validatePutRequest,
  validateDeleteRequest,
} from ".";

export const GET = async (request) => {
  try {
    const { id: userId, role, permissions = [] } = await getUser();

    const hasAccess = permissions.includes("CAN_GET_FICHES");
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no GET access" },
        { status: 403 }
      );
    }

    const { success, data, message } = validateGetRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { ids, download, getFile } = data;
    const isUser = role === "user" ? { userId } : null;

    if (download) {
      const fiches = await getFiches(ids, isUser);
      if (!fiches.length) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Not found: No fiche founded for downloading",
          },
          { status: 404 }
        );
      }
      const { fileBuffer, fileName } = await createFileBuffer(fiches);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            fileName
          )}"`,
          "Content-Type": "application/zip",
        },
      });
    }

    if (getFile) {
      fiches = await getFiches(ids, isUser);
      if (!fiches.length) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Not found: No fiche founded for downloading",
          },
          { status: 404 }
        );
      }

      const { path } = fiches[0];
    }

    const fiches = await getFichesForConsumption(ids, isUser);
    return NextResponse.json(
      { success: true, data: fiches, message: null },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, data: [], message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

export const PUT = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_UPDATE_ALL_FICHES");
    const hasOwnAccess = permissions.includes("CAN_UPDATE_OWN_FICHES");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no UPDATE access" },
        { status: 403 }
      );
    }

    const { success, data, message } = validatePutRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { items } = data;

    if (items.length === 1) {
      const item = items[0];

      const id = item?.id;
      const update = item?.update;

      const ownerId = await getOwnerFicheById(id);
      if (!ownerId) {
        return NextResponse.json(
          { success: false, data: [], message: "Not found: fiche not found" },
          { status: 404 }
        );
      }

      if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Forbidden: not allowed to update this fiche",
          },
          { status: 403 }
        );
      }

      const updatedFicheId = await updateFiche(id, update);
      if (!updatedFicheId) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Internal Server Error: failed to update fiche",
          },
          { status: 500 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            data: [id],
            message: "Fiche was updated successfully",
          },
          { status: 200 }
        );
      }
    } else {
      const updatedFicheIds = [];
      for (const id of ids) {
        const ownerId = await getOwnerFicheById(id);
        if (!ownerId) continue;

        if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) continue;

        const updatedFicheId = await updateFiche(id);
        if (updatedFicheId) {
          updatedFicheIds.push(updatedFicheId);
        }
      }

      const total = ids.length;
      const updated = updatedFicheIds.length;

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
            message: `${updated} out of ${total} fiches have been successfully updated`,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            data: ids,
            message: "Fiche was updated successfully",
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
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_FICHES");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_FICHES");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no DELETE access" },
        { status: 403 }
      );
    }

    const { success, data, message } = validateDeleteRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { ids } = data;

    if (ids.length === 1) {
      const id = ids[0];

      const ownerId = await getOwnerFicheById(id);
      if (!ownerId) {
        return NextResponse.json(
          { success: false, data: [], message: "Not found: fiche not found" },
          { status: 404 }
        );
      }

      if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Forbidden: not allowed to delete this fiche",
          },
          { status: 403 }
        );
      }

      const deletedFicheId = await deleteFiche(id);
      if (!deletedFicheId) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Internal Server Error: failed to delete fiche",
          },
          { status: 500 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            data: [id],
            message: "Fiche was deleted successfully",
          },
          { status: 200 }
        );
      }
    } else {
      const deletedFicheIds = [];
      for (const id of ids) {
        const ownerId = await getOwnerFicheById(id);
        if (!ownerId) continue;

        if (!hasAllAccess && (!hasOwnAccess || ownerId !== userId)) continue;

        const deletedFicheId = await deleteFiche(id);
        if (deletedFicheId) {
          deletedFicheIds.push(deletedFicheId);
        }
      }

      const total = ids.length;
      const deleted = deletedFicheIds.length;

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
            message: `${deleted} out of ${total} fiches have been successfully deleted`,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: true,
            data: ids,
            message: "Fiche was deleted successfully",
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
