import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUserSessions } from "@primer/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ sessions: [], total: 0, page, limit });
  }

  try {
    const { sessions, total } = await getUserSessions({
      userId: user.id,
      page,
      limit,
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
      total,
      page,
      limit,
      has_more: page * limit < total,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch sessions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
