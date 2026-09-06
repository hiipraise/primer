CREATE TABLE IF NOT EXISTS public_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID UNIQUE NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  idea_summary TEXT NOT NULL,
  stack_summary TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_prompts_public_created_idx ON public_prompts(is_public, created_at DESC);
ALTER TABLE public_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public prompts" ON public_prompts FOR SELECT USING (is_public = true);
CREATE POLICY "Owners can publish prompts" ON public_prompts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM generations JOIN sessions ON sessions.id = generations.session_id WHERE generations.id = public_prompts.generation_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Owners can update published prompts" ON public_prompts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM generations JOIN sessions ON sessions.id = generations.session_id WHERE generations.id = public_prompts.generation_id AND sessions.user_id = auth.uid())
);

ALTER TABLE generations ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'generic';