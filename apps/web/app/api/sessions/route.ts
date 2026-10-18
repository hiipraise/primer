import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUserSessions } from "@primer/db";
import { pageQuerySchema, parsePage } from "../../../lib/validation";
import { internalError } from "../../../lib/api-error";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = pageQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!query.success) return NextResponse.json({ error: "Invalid query parameters.", code: "INVALID_QUERY" }, { status: 400 });
  const page = Math.min(parsePage(query.data.page, 1, 1_000_000), 1_000_000);
  const limit = parsePage(query.data.limit, 20, 50);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return NextResponse.json({ sessions: [], total: 0, page, limit });

    const result = await getUserSessions({ userId: user.id, page, limit });
    return NextResponse.json({
      sessions: result.sessions.map(({ id, title, created_at, updated_at }) => ({ id, title, created_at, updated_at })),
      total: result.total,
      page,
      limit,
      has_more: page * limit < result.total,
    });
  } catch (error) {
    return internalError("api/sessions", error, "SESSIONS_FETCH_FAILED");
  }
}
