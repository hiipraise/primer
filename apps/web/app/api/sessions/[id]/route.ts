import { NextResponse } from "next/server";
import { deleteSession, getSession, updateSession } from "@primer/db";
import { getRequestIdentity, sessionOwner } from "../../../../lib/request-identity";
import { uuidSchema, updateSessionBodySchema } from "../../../../lib/validation";
import { internalError } from "../../../../lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

async function ownedSession(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return { response: NextResponse.json({ error: "Invalid session id.", code: "INVALID_SESSION_ID" }, { status: 400 }) };
  const owner = sessionOwner(await getRequestIdentity(request));
  if (!owner) return { response: NextResponse.json({ error: "Session not found.", code: "SESSION_NOT_FOUND" }, { status: 404 }) };
  const session = await getSession(id, owner);
  if (!session) return { response: NextResponse.json({ error: "Session not found.", code: "SESSION_NOT_FOUND" }, { status: 404 }) };
  return { id, owner };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const owned = await ownedSession(request, context);
    if ("response" in owned) return owned.response;
    const body = updateSessionBodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid session update.", code: "INVALID_REQUEST" }, { status: 400 });
    await updateSession(owned.id, { title: body.data.title }, owned.owner);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("api/sessions/[id]", error, "SESSION_UPDATE_FAILED");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const owned = await ownedSession(request, context);
    if ("response" in owned) return owned.response;
    await deleteSession(owned.id, owned.owner);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("api/sessions/[id]", error, "SESSION_DELETE_FAILED");
  }
}
