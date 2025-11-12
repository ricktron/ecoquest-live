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

type RuntimeEnvRecord = Record<string, unknown> | undefined;

function loadRuntimeEnv(): RuntimeEnvRecord {
  const globalEnv = (globalThis as any)?.window?.env;
  if (globalEnv && typeof globalEnv === "object") {
    return globalEnv as Record<string, unknown>;
  }

  const direct = (globalThis as any)?.env;
  if (direct && typeof direct === "object") {
    return direct as Record<string, unknown>;
  }

  return undefined;
}

let cachedRuntimeEnv: RuntimeEnvRecord;

export function getEnv(key: string, fallback?: string): string | undefined {
  const viteValue = (import.meta as any)?.env?.[key];
  if (viteValue != null) {
    return String(viteValue);
  }

  if (cachedRuntimeEnv === undefined) {
    cachedRuntimeEnv = loadRuntimeEnv();
  }

  const runtimeValue = cachedRuntimeEnv?.[key];
  if (runtimeValue != null) {
    return String(runtimeValue);
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
  VITE_FEATURE_TICKERS:
    getEnv("VITE_FEATURE_TICKERS") ?? getEnv("VITE_FEATURE_TICKER") ?? "0",
  VITE_FEATURE_DAILY_TROPHIES: import.meta.env.VITE_FEATURE_DAILY_TROPHIES,
  VITE_TICKER_SPEED_MS: import.meta.env.VITE_TICKER_SPEED_MS,
  VITE_TZ: import.meta.env.VITE_TZ,
  VITE_EMAIL_FROM: import.meta.env.VITE_EMAIL_FROM,
  VITE_ENABLE_EMAIL_DIGEST: import.meta.env.VITE_ENABLE_EMAIL_DIGEST,
  VITE_DIGEST_TO: import.meta.env.VITE_DIGEST_TO,
  VITE_RARITY_GROUP_WEIGHT: import.meta.env.VITE_RARITY_GROUP_WEIGHT,
  VITE_RARITY_LOCAL_WEIGHT: import.meta.env.VITE_RARITY_LOCAL_WEIGHT,
  VITE_BASELINE_YEARS: import.meta.env.VITE_BASELINE_YEARS,
  VITE_BASELINE_MONTHS: import.meta.env.VITE_BASELINE_MONTHS,
  VITE_ENABLE_COMPARE: import.meta.env.VITE_ENABLE_COMPARE,
  VITE_FEATURE_BINGO: import.meta.env.VITE_FEATURE_BINGO,
  VITE_FEATURE_BINGO_CLAIMS: import.meta.env.VITE_FEATURE_BINGO_CLAIMS,
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
  VITE_FEATURE_TICKERS: z.any().optional(),
  VITE_FEATURE_TICKER: z.any().optional(),
  VITE_FEATURE_DAILY_TROPHIES: z.any().optional(),
  VITE_TICKER_SPEED_MS: z.string().optional(),
  VITE_TZ: z.string().optional(),
  VITE_EMAIL_FROM: z.string().optional(),
  VITE_ENABLE_EMAIL_DIGEST: z.any().optional(),
  VITE_DIGEST_TO: z.string().optional(),
  VITE_RARITY_GROUP_WEIGHT: z.string().optional(),
  VITE_RARITY_LOCAL_WEIGHT: z.string().optional(),
  VITE_BASELINE_YEARS: z.string().optional(),
  VITE_BASELINE_MONTHS: z.string().optional(),
  VITE_ENABLE_COMPARE: z.any().optional(),
  VITE_FEATURE_BINGO: z.any().optional(),
  VITE_FEATURE_BINGO_CLAIMS: z.any().optional(),
});

const parsed = EnvSchema.parse(RawEnv);

export const ENV = {
  SUPABASE_URL: parsed.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: parsed.VITE_SUPABASE_ANON_KEY,
  DEFAULT_ASSIGNMENT_ID: parsed.VITE_DEFAULT_ASSIGNMENT_ID,
  
  TRIP_PROFILE: parsed.VITE_TRIP_PROFILE || 'TEST',
  TRIP_MODE: parsed.VITE_TRIP_MODE || "testing",
  TRIP_START: parsed.VITE_TRIP_START,
  TRIP_END: parsed.VITE_TRIP_END,
  TZ: parsed.VITE_TZ || "America/Costa_Rica",
  TICKER_SPEED_MS: parseInt(parsed.VITE_TICKER_SPEED_MS || "30000", 10),
  
  RARITY_GROUP_WEIGHT: parseFloat(parsed.VITE_RARITY_GROUP_WEIGHT || "0.7"),
  RARITY_LOCAL_WEIGHT: parseFloat(parsed.VITE_RARITY_LOCAL_WEIGHT || "0.3"),
  BASELINE_YEARS: parseInt(parsed.VITE_BASELINE_YEARS || "5", 10),
  BASELINE_MONTHS: (parsed.VITE_BASELINE_MONTHS || "10,11,12")
    .split(',')
    .map((m) => parseInt(m.trim(), 10)),
    
  EMAIL_FROM: parsed.VITE_EMAIL_FROM || '',
  DIGEST_TO: parsed.VITE_DIGEST_TO || '',
  RAW: RawEnv,
} as const;

export const FLAGS = {
  TROPHIES_ENABLED: toBool(RawEnv.VITE_FEATURE_TROPHIES, false),
  ADMIN_ENABLED: toBool(RawEnv.VITE_ENABLE_ADMIN, false),
  LOCK_DATES: toBool(RawEnv.VITE_LOCK_DATES, parsed.VITE_TRIP_MODE !== "testing"),
  TICKER_ENABLED: toBool(RawEnv.VITE_FEATURE_TICKERS, false),
  DAILY_TROPHIES_ENABLED: toBool(RawEnv.VITE_FEATURE_DAILY_TROPHIES, true),
  EMAIL_DIGEST_ENABLED: toBool(RawEnv.VITE_ENABLE_EMAIL_DIGEST, false),
  ENABLE_COMPARE: toBool(RawEnv.VITE_ENABLE_COMPARE, false),
  FEATURE_BINGO: toBool(RawEnv.VITE_FEATURE_BINGO, false),
  FEATURE_BINGO_CLAIMS: toBool(RawEnv.VITE_FEATURE_BINGO_CLAIMS, false),
} as const;
