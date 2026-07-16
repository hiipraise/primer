-- Migration 003: Allow authenticated users to claim anonymous sessions
-- ============================================================
-- Root cause: the UPDATE policy on sessions only allows rows where
-- user_id = auth.uid(), but anonymous sessions have user_id IS NULL.
-- When claimAnonSessions() tries to UPDATE them, RLS blocks the operation,
-- the function silently returns 0, and the client never shows the success UI.
--
-- Fix: add a dedicated policy that allows an authenticated user to UPDATE
-- anonymous sessions (user_id IS NULL) and set their own user_id.
-- The WITH CHECK clause ensures the user can only claim sessions for
-- themselves, preventing one user from stealing another's sessions.
--
-- Apply in Supabase SQL editor → New Query → paste → Run
-- ============================================================

CREATE POLICY "Users can claim anonymous sessions"
  ON sessions FOR UPDATE
  USING (user_id IS NULL AND anon_cookie_id IS NOT NULL)
  WITH CHECK (user_id = auth.uid());
