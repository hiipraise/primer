import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@primer/db";
import { authCallbackQuerySchema } from "../../../lib/validation";
import { sanitizeNextPath } from "../../../lib/redirect";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const query = authCallbackQuerySchema.safeParse({
    code: searchParams.get("code") ?? undefined,
    next: searchParams.get("next") ?? undefined,
  });
  const next = sanitizeNextPath(query.success ? query.data.next : null);

  if (query.success && query.data.code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(query.data.code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
      console.error("[auth/callback] OAUTH_EXCHANGE_FAILED", error);
    } catch (error) {
      console.error("[auth/callback] OAUTH_EXCHANGE_FAILED", error);
    }
  }

  return NextResponse.redirect(new URL("/?error=auth_callback_failed", origin));
}
