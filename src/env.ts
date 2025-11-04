import { z } from "zod";

// Helper to convert any value to boolean string
const toBool = (val: any): "true" | "false" => {
  if (val === undefined || val === null) return "false";
  return String(val).trim().toLowerCase() === "true" ? "true" : "false";
};

// Zod schema for environment validation
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_DEFAULT_ASSIGNMENT_ID: z.string().min(1),
  VITE_FEATURE_TROPHIES: z.enum(["true", "false"]),
  VITE_ENABLE_ADMIN: z.enum(["true", "false"]),
});

// Parse and validate environment variables
export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_DEFAULT_ASSIGNMENT_ID: import.meta.env.VITE_DEFAULT_ASSIGNMENT_ID,
  VITE_FEATURE_TROPHIES: toBool(import.meta.env.VITE_FEATURE_TROPHIES),
  VITE_ENABLE_ADMIN: toBool(import.meta.env.VITE_ENABLE_ADMIN),
});

// Export parsed feature flags
export const FLAGS = {
  TROPHIES_ENABLED: env.VITE_FEATURE_TROPHIES === "true",
  ADMIN_ENABLED: env.VITE_ENABLE_ADMIN === "true",
};
