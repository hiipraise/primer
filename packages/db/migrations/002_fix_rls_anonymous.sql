-- Migration 002: Fix RLS policies for anonymous users
-- ============================================================
-- Root cause: anon_sessions had RLS enabled with no policies,
-- which blocked ALL operations when using the anon API key.
-- Additionally, sessions and generations policies only allowed
-- authenticated user operations, breaking the anonymous flow.
--
-- Apply this in the Supabase SQL editor → New Query → paste → Run

-- ============================================================
-- 1. anon_sessions — disable RLS entirely
--    This table is managed server-side via httpOnly cookie.
--    API routes handle auth validation before touching it.
--    RLS can't protect it because there is no auth.uid() for
--    anonymous users — the session is keyed by cookie_id.
-- ============================================================
ALTER TABLE anon_sessions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. sessions — allow both authenticated AND anonymous rows
--    Anonymous sessions have user_id = NULL and anon_cookie_id set.
-- ============================================================

-- Drop old policies (safe — IF EXISTS)
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

-- SELECT: authenticated users see their own; anonymous sessions are visible
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND anon_cookie_id IS NOT NULL)
  );

-- INSERT: authenticated users can create with their id; anonymous can create without user_id
CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND anon_cookie_id IS NOT NULL)
  );

-- UPDATE: only authenticated users can update; context: anonymous sessions
-- are ephemeral and don't need updating after creation (the API routes
-- handle anonymous updates through the cookie check).
CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: only authenticated users can delete
CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 3. generations — allow operations for anonymous sessions too
--    Uses a subquery to check the parent session's ownership.
-- ============================================================

DROP POLICY IF EXISTS "Users can view generations in own sessions" ON generations;
DROP POLICY IF EXISTS "Users can create generations in own sessions" ON generations;
DROP POLICY IF EXISTS "Users can update generations in own sessions" ON generations;
DROP POLICY IF EXISTS "Users can delete generations in own sessions" ON generations;

-- SELECT: can view if parent session is own (auth) or anonymous
CREATE POLICY "Users can view generations in own sessions"
  ON generations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = generations.session_id
      AND (
        sessions.user_id = auth.uid()
        OR (sessions.user_id IS NULL AND sessions.anon_cookie_id IS NOT NULL)
      )
    )
  );

-- INSERT: can create if parent session is own (auth) or anonymous
CREATE POLICY "Users can create generations in own sessions"
  ON generations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = generations.session_id
      AND (
        sessions.user_id = auth.uid()
        OR (sessions.user_id IS NULL AND sessions.anon_cookie_id IS NOT NULL)
      )
    )
  );

-- UPDATE: only authenticated users
CREATE POLICY "Users can update generations in own sessions"
  ON generations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = generations.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- DELETE: only authenticated users
CREATE POLICY "Users can delete generations in own sessions"
  ON generations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = generations.session_id
      AND sessions.user_id = auth.uid()
    )
  );
