import { NextResponse } from "next/server";
import { publishGeneration } from "@primer/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    const prompt = await publishGeneration({
      generationId: id,
      isPublic: body.is_public !== false,
    });
    return NextResponse.json({ prompt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not publish generation.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
