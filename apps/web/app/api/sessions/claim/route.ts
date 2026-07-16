import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  claimAnonSessions,
  getCookieValue,
} from "@primer/db";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const cookieHeader = request.headers.get("cookie");
  const anonCookieId = getCookieValue(cookieHeader, "primer_anon_id");

  if (!anonCookieId) {
    return NextResponse.json({ claimed: 0 });
  }

  try {
    const count = await claimAnonSessions({
      anonCookieId,
      userId: user.id,
    });

    return NextResponse.json({ claimed: count });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to claim sessions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
