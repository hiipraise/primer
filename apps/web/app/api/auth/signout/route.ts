import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@primer/db";
import { internalError } from "../../../../lib/api-error";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ signed_out: true });
  } catch (error) {
    return internalError("api/auth/signout", error, "SIGNOUT_FAILED");
  }
}
