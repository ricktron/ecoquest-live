-- Add flags JSONB column to config_filters for storing announcement text
ALTER TABLE public.config_filters 
ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '{}'::jsonb;