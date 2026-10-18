DO $$
BEGIN
  IF to_regclass('public.public_prompts') IS NULL THEN
    RAISE EXCEPTION
      'Cannot apply 008_public_library.sql: public.public_prompts does not exist. Apply migrations 001 through 007 in order to this Supabase project first, then retry migration 008.';
  END IF;
END;
$$;

ALTER TABLE public.public_prompts
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'visible'
    CHECK (moderation_status IN ('visible', 'flagged', 'hidden')),
  ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.public_prompts AS prompt
SET tags = COALESCE((
  SELECT array_agg(DISTINCT lower(trim(both '-' from regexp_replace(item->>'name', '[^a-zA-Z0-9]+', '-', 'g'))))
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(prompt.stack_summary::jsonb) = 'array' THEN prompt.stack_summary::jsonb ELSE '[]'::jsonb END) AS items(item)
  WHERE item ? 'name'
), '{}')
WHERE prompt.stack_summary <> '';

CREATE INDEX IF NOT EXISTS public_prompts_tags_idx ON public.public_prompts USING GIN (tags);
CREATE INDEX IF NOT EXISTS public_prompts_moderation_idx ON public.public_prompts (moderation_status, is_public, created_at DESC);

CREATE OR REPLACE FUNCTION increment_public_prompt_view(p_slug TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.public_prompts
  SET view_count = view_count + 1
  WHERE slug = p_slug AND is_public = TRUE AND moderation_status = 'visible'
  RETURNING view_count;
$$;

CREATE OR REPLACE FUNCTION report_public_prompt(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.public_prompts
  SET report_count = report_count + 1,
      moderation_status = 'flagged'
  WHERE slug = p_slug AND is_public = TRUE AND moderation_status = 'visible';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION increment_public_prompt_view(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION report_public_prompt(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_public_prompt_view(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION report_public_prompt(TEXT) TO service_role;
