import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_DEFAULT_ASSIGNMENT_ID: z.string().min(1),
  VITE_FEATURE_TROPHIES: z.enum(["true", "false"]).default("false"),
  VITE_ENABLE_ADMIN: z.enum(["true", "false"]).default("false"),
});

export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_DEFAULT_ASSIGNMENT_ID: import.meta.env.VITE_DEFAULT_ASSIGNMENT_ID,
  VITE_FEATURE_TROPHIES: import.meta.env.VITE_FEATURE_TROPHIES || "false",
  VITE_ENABLE_ADMIN: import.meta.env.VITE_ENABLE_ADMIN || "false",
});
