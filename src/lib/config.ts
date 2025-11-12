const TRUTHY = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'n', 'off', '']);

type FlagValue = '0' | '1';

function coerceFlag(value: unknown): FlagValue {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return value === 0 ? '0' : '1';
  const normalized = String(value).trim().toLowerCase();
  if (TRUTHY.has(normalized)) return '1';
  if (FALSY.has(normalized)) return '0';
  return normalized.length > 0 ? '1' : '0';
}

/**
 * Resolve a feature flag from build-time and runtime environment sources.
 *
 * Precedence: import.meta.env -> window.__ENV -> default "0".
 */
export function getFeature(name: string): FlagValue {
  const importMetaEnv = (import.meta as any)?.env?.[name];
  if (importMetaEnv != null) {
    return coerceFlag(importMetaEnv);
  }

  if (typeof window !== 'undefined') {
    const windowEnv = (window as any).__ENV?.[name];
    if (windowEnv != null) {
      return coerceFlag(windowEnv);
    }
  }

  return '0';
}

export function coerceFeature(value: unknown): FlagValue {
  return coerceFlag(value);
}
