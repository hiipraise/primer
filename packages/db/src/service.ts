import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Creates a Supabase client using the service role key.
 *
 * This client **bypasses all RLS policies** — use it only for
 * server-side data operations that should not be subject to RLS
 * (e.g., `anon_sessions` which is keyed by httpOnly cookie).
 *
 * The service role key is a secret and must NOT be exposed to the
 * client. Keep it in server-only environment variables.
 *
 * This is intentionally NOT an SSR client — it doesn't need cookie
 * management because it operates server-side with full privileges.
 */
export function createServiceRoleClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase service role environment variable is not set. " +
        "Ensure SUPABASE_SERVICE_ROLE_KEY is defined in your environment " +
        "(alongside NEXT_PUBLIC_SUPABASE_URL)."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
