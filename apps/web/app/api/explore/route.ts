import { NextResponse } from "next/server";
import { listPublicPrompts } from "@primer/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? "20") || 20),
  );
  const prompts = await listPublicPrompts({
    page,
    limit,
    tag: searchParams.get("tag") ?? undefined,
  });
  return NextResponse.json({
    prompts,
    page,
    limit,
    has_more: prompts.length === limit,
  });
}
