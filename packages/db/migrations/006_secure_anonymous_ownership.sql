-- Anonymous application data is accessed only by server code after it checks
-- the primer_anon_id cookie. Public anon/authenticated roles must not access
-- rows merely because user_id IS NULL.

ALTER TABLE public.anon_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_anon_direct_access" ON public.anon_sessions;
CREATE POLICY "block_anon_direct_access"
  ON public.anon_sessions FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can claim anonymous sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view generations in own sessions" ON public.generations;
DROP POLICY IF EXISTS "Users can create generations in own sessions" ON public.generations;
DROP POLICY IF EXISTS "Users can update generations in own sessions" ON public.generations;
DROP POLICY IF EXISTS "Users can delete generations in own sessions" ON public.generations;

CREATE POLICY "Users can view generations in own sessions"
  ON public.generations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = generations.session_id
      AND sessions.user_id = (SELECT auth.uid())
  ));
CREATE POLICY "Users can create generations in own sessions"
  ON public.generations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = generations.session_id
      AND sessions.user_id = (SELECT auth.uid())
  ));
CREATE POLICY "Users can update generations in own sessions"
  ON public.generations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = generations.session_id
      AND sessions.user_id = (SELECT auth.uid())
  ));
CREATE POLICY "Users can delete generations in own sessions"
  ON public.generations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = generations.session_id
      AND sessions.user_id = (SELECT auth.uid())
  ));

-- Reserve one anonymous generation atomically before invoking the LLM.
CREATE OR REPLACE FUNCTION public.consume_anon_generation(p_cookie_id text, p_cap integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.anon_sessions
  SET generations_used = generations_used + 1
  WHERE cookie_id = p_cookie_id
    AND generations_used < p_cap
  RETURNING generations_used;
$$;

CREATE OR REPLACE FUNCTION public.refund_anon_generation(p_cookie_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.anon_sessions
  SET generations_used = GREATEST(generations_used - 1, 0)
  WHERE cookie_id = p_cookie_id;
$$;

REVOKE ALL ON FUNCTION public.consume_anon_generation(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_anon_generation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_anon_generation(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_anon_generation(text) TO service_role;
