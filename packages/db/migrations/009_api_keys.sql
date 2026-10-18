-- API key secrets are hashed before storage and never returned after creation.
CREATE TABLE IF NOT EXISTS public.primer_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS primer_api_keys_user_created_idx
  ON public.primer_api_keys(user_id, created_at DESC);
ALTER TABLE public.primer_api_keys ENABLE ROW LEVEL SECURITY;
