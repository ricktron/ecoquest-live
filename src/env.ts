import { z } from "zod";

/** Normalize booleans coming in as strings, numbers, or quoted strings. */
function toBool(input: unknown, fallback = false): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input !== 0;
  if (typeof input === "string") {
    const s = input.trim().replace(/^"(.*)"$/, "$1").toLowerCase();
    return ["1", "true", "yes", "y", "on"].includes(s);
  }
  return fallback;
}

const RawEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_DEFAULT_ASSIGNMENT_ID: import.meta.env.VITE_DEFAULT_ASSIGNMENT_ID,
  VITE_FEATURE_TROPHIES: import.meta.env.VITE_FEATURE_TROPHIES,
  VITE_ENABLE_ADMIN: import.meta.env.VITE_ENABLE_ADMIN,
};

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().min(1, "Missing VITE_SUPABASE_URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "Missing VITE_SUPABASE_ANON_KEY"),
  VITE_DEFAULT_ASSIGNMENT_ID: z.string().min(1, "Missing VITE_DEFAULT_ASSIGNMENT_ID"),
  // feature flags remain optional and are parsed separately
  VITE_FEATURE_TROPHIES: z.any().optional(),
  VITE_ENABLE_ADMIN: z.any().optional(),
});

const parsed = EnvSchema.parse(RawEnv);

export const ENV = {
  SUPABASE_URL: parsed.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: parsed.VITE_SUPABASE_ANON_KEY,
  DEFAULT_ASSIGNMENT_ID: parsed.VITE_DEFAULT_ASSIGNMENT_ID,
  RAW: RawEnv,
} as const;

export const FLAGS = {
  TROPHIES_ENABLED: toBool(RawEnv.VITE_FEATURE_TROPHIES, false),
  ADMIN_ENABLED: toBool(RawEnv.VITE_ENABLE_ADMIN, false),
} as const;
