import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@primer/db";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return NextResponse.redirect(siteUrl);
}
