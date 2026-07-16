import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Silently refresh the auth session — this is what keeps users logged in
  // across tab closes and browser restarts, without touching localStorage.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Issue an anonymous cookie for pre-signup users.
  // This is an httpOnly, secure, server-side cookie — never accessible via JS.
  // Used to key anon_sessions and sessions.anon_cookie_id for anonymous usage tracking.
  if (!user && !request.cookies.has("primer_anon_id")) {
    supabaseResponse.cookies.set("primer_anon_id", crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  return supabaseResponse;
}

// Run middleware on all routes except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
