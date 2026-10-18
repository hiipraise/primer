import { NextResponse } from "next/server";
import { listPublicPrompts } from "@primer/db";
import { exploreQuerySchema, parsePage } from "../../../lib/validation";
import { internalError } from "../../../lib/api-error";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = exploreQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
  });
  if (!query.success) return NextResponse.json({ error: "Invalid query parameters.", code: "INVALID_QUERY" }, { status: 400 });

  const page = Math.min(parsePage(query.data.page, 1, 1_000_000), 1_000_000);
  const limit = parsePage(query.data.limit, 20, 50);
  try {
    const prompts = await listPublicPrompts({ page, limit, tag: query.data.tag });
    return NextResponse.json({ prompts, page, limit, has_more: prompts.length === limit });
  } catch (error) {
    return internalError("api/explore", error, "EXPLORE_FETCH_FAILED");
  }
}
