import { NextResponse } from "next/server";
import { claimAnonSessions } from "@primer/db";
import { internalError } from "../../../../lib/api-error";
import { getRequestIdentity } from "../../../../lib/request-identity";

export async function POST(request: Request) {
  try {
    const { userId, anonCookieId } = await getRequestIdentity(request);
    if (!userId) return NextResponse.json({ error: "Not authenticated.", code: "UNAUTHORIZED" }, { status: 401 });
    if (!anonCookieId) return NextResponse.json({ claimed: 0 });
    const count = await claimAnonSessions({
      anonCookieId,
      userId,
    });

    return NextResponse.json({ claimed: count });
  } catch (error) {
    return internalError("api/sessions/claim", error, "SESSION_CLAIM_FAILED");
  }
}
