-- Enable RLS on config_scoring table
ALTER TABLE public.config_scoring ENABLE ROW LEVEL SECURITY;

-- Allow public read access to scoring config (needed for UI to display rules)
CREATE POLICY "config_scoring_read_public" ON public.config_scoring
  FOR SELECT USING (true);

-- No public write policy - admin only via service role