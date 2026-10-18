import { NextResponse } from "next/server";
import { getAnonSessions } from "@primer/db";
import { internalError } from "../../../../lib/api-error";
import { getRequestIdentity } from "../../../../lib/request-identity";

export async function GET(request: Request) {
  try {
    const { userId, anonCookieId } = await getRequestIdentity(request);
    if (!userId || !anonCookieId) return NextResponse.json({ pending: 0 });
    const sessions = await getAnonSessions(anonCookieId);
    return NextResponse.json({ pending: sessions.length });
  } catch (error) {
    return internalError("api/sessions/pending-claim", error, "PENDING_CLAIM_FAILED");
  }
}
