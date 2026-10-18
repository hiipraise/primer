-- Store the validated, versioned engine specification alongside its formatted output.
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS spec_json JSONB,
  ADD COLUMN IF NOT EXISTS change_summary TEXT;

COMMENT ON COLUMN public.generations.spec_json IS 'Validated structured project recommendation produced for this generation version.';
COMMENT ON COLUMN public.generations.change_summary IS 'Short summary of changes made in this generation version.';
