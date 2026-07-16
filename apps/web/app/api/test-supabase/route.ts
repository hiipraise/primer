import { NextResponse } from "next/server";
import { createClient } from "@primer/db";

export async function GET() {
  try {
    const supabase = createClient();

    // Check Supabase connectivity via auth endpoint
    // This proves the project is reachable without depending on any table
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { status: "error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Supabase is reachable.",
      authenticated: !!session,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
