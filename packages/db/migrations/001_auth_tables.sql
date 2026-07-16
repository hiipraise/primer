-- Migration 001: Auth tables for Primer
-- Creates anon_sessions, sessions, and generations tables with RLS

-- ============================================================
-- Table: anon_sessions
-- Tracks anonymous users via httpOnly cookie (primer_anon_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS anon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cookie_id TEXT UNIQUE NOT NULL,
  generations_used INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- Table: sessions
-- Groups a chain of refinements around one user idea
-- Belongs to either an authenticated user or an anonymous cookie
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL,
  anon_cookie_id TEXT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT sessions_owner_check CHECK (
    (user_id IS NOT NULL) OR (anon_cookie_id IS NOT NULL)
  )
);

-- ============================================================
-- Table: generations
-- One version within a session — the core data entity
-- ============================================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  user_input TEXT NOT NULL,
  output_prompt TEXT NOT NULL,
  stack_json JSONB,
  tools_json JSONB,
  skills_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_user_updated_idx ON sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS sessions_anon_cookie_id_idx ON sessions(anon_cookie_id);
CREATE INDEX IF NOT EXISTS anon_sessions_cookie_id_idx ON anon_sessions(cookie_id);
CREATE INDEX IF NOT EXISTS generations_session_id_idx ON generations(session_id);
CREATE INDEX IF NOT EXISTS generations_version_idx ON generations(session_id, version_number);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE anon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- anon_sessions: RLS is DISABLED because this table is managed server-side via
-- httpOnly cookie. API routes handle auth validation before accessing it.
-- RLS cannot protect it because anonymous users have no auth.uid() — the
-- session is keyed by cookie_id which is not available in RLS policies.
ALTER TABLE anon_sessions DISABLE ROW LEVEL SECURITY;

-- Sessions: allow both authenticated AND anonymous operations
-- Anonymous sessions have user_id = NULL and anon_cookie_id IS NOT NULL

CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND anon_cookie_id IS NOT NULL)
  );

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (user_id IS NULL AND anon_cookie_id IS NOT NULL)
  );

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (user_id = auth.uid());

-- Generations: allow operations for anonymous sessions too

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

CREATE POLICY "Users can update generations in own sessions"
  ON generations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = generations.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete generations in own sessions"
  ON generations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = generations.session_id
      AND sessions.user_id = auth.uid()
    )
  );
