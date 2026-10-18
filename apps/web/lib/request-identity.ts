import { createServerSupabaseClient, getCookieValue } from "@primer/db";
import type { SessionOwner } from "@primer/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getRequestIdentity(request: Request): Promise<{
  userId: string | null;
  anonCookieId: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[request-identity] AUTH_LOOKUP_FAILED", error);
    throw new Error("Unable to resolve request identity.");
  }
  const rawCookie = getCookieValue(request.headers.get("cookie"), "primer_anon_id");
  return {
    userId: data.user?.id ?? null,
    anonCookieId: rawCookie && UUID_RE.test(rawCookie) ? rawCookie : null,
  };
}

export function sessionOwner(identity: {
  userId: string | null;
  anonCookieId: string | null;
}): SessionOwner | null {
  if (identity.userId) return { userId: identity.userId };
  if (identity.anonCookieId) return { userId: null, anonCookieId: identity.anonCookieId };
  return null;
}

export function getClientIp(request: Request): string {
  const platformIp = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-real-ip");
  return platformIp?.split(",")[0]?.trim() || "unknown";
}

export function attachAnonCookie(response: Response, cookieId: string, shouldSet: boolean): Response {
  if (shouldSet) {
    response.headers.append(
      "Set-Cookie",
      `primer_anon_id=${encodeURIComponent(cookieId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }
  return response;
}
