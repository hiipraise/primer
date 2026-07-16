import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@primer/db";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name:
        user.user_metadata?.full_name ??
        user.email?.split("@")[0] ??
        "Unknown",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
  });
}
