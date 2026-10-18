import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@primer/db";
import { internalError } from "../../../../lib/api-error";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) throw error;
    return NextResponse.json({ url: data.url });
  } catch (error) {
    return internalError("api/auth/signin", error, "SIGNIN_FAILED");
  }
}
