import { NextResponse } from "next/server";
import * as up from "@/lib/uploads";

export const GET = async (request) => {
  try {
    return NextResponse.json(
      {
        success: true,
        data: { age },
        message: "Succuss",
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Erreur interne du serveur" + " --- " + e.message,
      },
      { status: 500 }
    );
  }
};
