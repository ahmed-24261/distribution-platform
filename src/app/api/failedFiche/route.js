import { NextResponse } from "next/server";
import { getUser } from "@/lib/api";
import { getFailedFiches } from "@/lib/failedFiche";
import { validateGetRequest, createFileBuffer, validateDeleteRequest } from ".";

export const GET = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_GET_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_GET_OWN_UPLOADS");
    if (!hasAllAccess && !hasOwnAccess) {
      return NextResponse.json(
        { success: false, data: [], message: "Forbidden: no Get access" },
        { status: 403 }
      );
    }

    const { success, data, message } = validateGetRequest(request);
    if (!success) {
      return NextResponse.json({ success, data, message }, { status: 400 });
    }

    const { ids, download } = data;

    const ownerId = !hasAllAccess ? userId : null;
    if (download) {
      const fiches = await getFailedFiches(ids, ownerId);
      if (!fiches.length) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            message: "Not found: No failed fiche founded for downloading",
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

    return NextResponse.json(
      { success: true, data: [], message: null },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, data: [], message: "Internal Server Error" },
      { status: 500 }
    );
  }
};

export const DELETE = async (request) => {
  try {
    const { id: userId, permissions = [] } = await getUser();

    const hasAllAccess = permissions.includes("CAN_DELETE_ALL_UPLOADS");
    const hasOwnAccess = permissions.includes("CAN_DELETE_OWN_UPLOADS");
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
      const getResponse = await getFailedFiche(id);
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
