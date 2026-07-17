-- Migration 004: Enable RLS on anon_sessions with restrictive policies
-- ============================================================
-- Context: anon_sessions is ONLY accessed server-side via the service role
-- Supabase client (createServiceRoleClient), which bypasses RLS entirely.
-- The server-side client uses SUPABASE_SERVICE_ROLE_KEY (a server-only
-- secret), NOT the public anon key.
--
-- This means we can safely enable RLS with policies that DENY all direct
-- client access (USING false). Any attempt to query this table through
-- the public anon key will be blocked by RLS.
--
-- Prerequisites before applying:
--   1. Set SUPABASE_SERVICE_ROLE_KEY in your environment (server-side only)
--   2. The server-side code must use createServiceRoleClient() for
--      anon_sessions operations (from @primer/db)
--
-- Apply in Supabase SQL editor → New Query → paste → Run
-- ============================================================

-- ============================================================
-- 1. Enable RLS on anon_sessions
-- ============================================================
ALTER TABLE anon_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Drop any existing policies (safe — IF EXISTS)
-- ============================================================
DROP POLICY IF EXISTS "block_anon_direct_access" ON anon_sessions;

-- ============================================================
-- 3. Create a policy that blocks ALL direct client access.
--
-- This policy returns false for every row, effectively denying
-- all SELECT, INSERT, UPDATE, and DELETE operations through the
-- public anon key. The only way to access this table is via the
-- service role key (server-side), which bypasses RLS entirely.
-- ============================================================

CREATE POLICY "block_anon_direct_access"
  ON anon_sessions
  FOR ALL
  USING (false)
  WITH CHECK (false);
