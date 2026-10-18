import { NextResponse } from "next/server";
import { hasOwnedGeneration, publishGeneration } from "@primer/db";
import { getRequestIdentity, sessionOwner } from "../../../../../lib/request-identity";
import { publishBodySchema, uuidSchema } from "../../../../../lib/validation";
import { internalError } from "../../../../../lib/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid generation ID.", code: "INVALID_ID" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const parsedBody = publishBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid publish request.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const owner = sessionOwner(await getRequestIdentity(request));
    if (!owner) return NextResponse.json({ error: "Authentication required.", code: "UNAUTHORIZED" }, { status: 401 });
    if (!(await hasOwnedGeneration(id, owner))) {
      return NextResponse.json({ error: "Generation not found.", code: "GENERATION_NOT_FOUND" }, { status: 404 });
    }
    const prompt = await publishGeneration({
      generationId: id,
      isPublic: parsedBody.data.is_public ?? true,
      owner,
    });
    return NextResponse.json({ prompt });
  } catch (error) {
    return internalError("api/generations/publish", error, "PUBLISH_FAILED");
  }
}
