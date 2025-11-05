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
  VITE_TRIP_MODE: import.meta.env.VITE_TRIP_MODE,
  VITE_TRIP_PROFILE: import.meta.env.VITE_TRIP_PROFILE,
  VITE_TRIP_START: import.meta.env.VITE_TRIP_START,
  VITE_TRIP_END: import.meta.env.VITE_TRIP_END,
  VITE_LOCK_DATES: import.meta.env.VITE_LOCK_DATES,
  VITE_FEATURE_TICKER: import.meta.env.VITE_FEATURE_TICKER,
  VITE_FEATURE_DAILY_TROPHIES: import.meta.env.VITE_FEATURE_DAILY_TROPHIES,
};

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().min(1, "Missing VITE_SUPABASE_URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "Missing VITE_SUPABASE_ANON_KEY"),
  VITE_DEFAULT_ASSIGNMENT_ID: z.string().min(1, "Missing VITE_DEFAULT_ASSIGNMENT_ID"),
  VITE_FEATURE_TROPHIES: z.any().optional(),
  VITE_ENABLE_ADMIN: z.any().optional(),
  VITE_TRIP_MODE: z.enum(["testing", "costa_rica", "big_bend", "campus"]).optional(),
  VITE_TRIP_PROFILE: z.enum(["testing", "costa_rica", "big_bend", "campus"]).optional(),
  VITE_TRIP_START: z.string().optional(),
  VITE_TRIP_END: z.string().optional(),
  VITE_LOCK_DATES: z.any().optional(),
  VITE_FEATURE_TICKER: z.any().optional(),
  VITE_FEATURE_DAILY_TROPHIES: z.any().optional(),
});

const parsed = EnvSchema.parse(RawEnv);

export const ENV = {
  SUPABASE_URL: parsed.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: parsed.VITE_SUPABASE_ANON_KEY,
  DEFAULT_ASSIGNMENT_ID: parsed.VITE_DEFAULT_ASSIGNMENT_ID,
  TRIP_MODE: parsed.VITE_TRIP_MODE || "testing",
  TRIP_START: parsed.VITE_TRIP_START,
  TRIP_END: parsed.VITE_TRIP_END,
  RAW: RawEnv,
} as const;

export const FLAGS = {
  TROPHIES_ENABLED: toBool(RawEnv.VITE_FEATURE_TROPHIES, false),
  ADMIN_ENABLED: toBool(RawEnv.VITE_ENABLE_ADMIN, false),
  LOCK_DATES: toBool(RawEnv.VITE_LOCK_DATES, parsed.VITE_TRIP_MODE !== "testing"),
  TICKER_ENABLED: toBool(RawEnv.VITE_FEATURE_TICKER, true),
  DAILY_TROPHIES_ENABLED: toBool(RawEnv.VITE_FEATURE_DAILY_TROPHIES, true),
} as const;
