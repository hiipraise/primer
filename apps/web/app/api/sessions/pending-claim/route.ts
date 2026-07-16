import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAnonSessions,
  getCookieValue,
} from "@primer/db";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ pending: 0 });
  }

  const cookieHeader = request.headers.get("cookie");
  const anonCookieId = getCookieValue(cookieHeader, "primer_anon_id");

  if (!anonCookieId) {
    return NextResponse.json({ pending: 0 });
  }

  try {
    const sessions = await getAnonSessions(anonCookieId);
    return NextResponse.json({ pending: sessions.length });
  } catch {
    return NextResponse.json({ pending: 0 });
  }
}
