DO $$
BEGIN
  IF to_regclass('public.public_prompts') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'public_prompts'
         AND column_name = 'moderation_status'
     ) THEN
    RAISE EXCEPTION
      'Cannot apply 010_hide_moderated_prompts.sql: apply 008_public_library.sql in this project first.';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Anyone can view public prompts" ON public.public_prompts;
CREATE POLICY "Anyone can view visible public prompts"
  ON public.public_prompts FOR SELECT
  USING (is_public = TRUE AND moderation_status = 'visible');
