export type Profile = 'LIVE' | 'TEST';

function resolveProfile(): Profile {
  const env = (import.meta as any)?.env?.VITE_PROFILE as string | undefined;
  // @ts-ignore window global fallback
  const win = (globalThis as any).__EQL?.PROFILE as string | undefined;
  const loc = (typeof localStorage !== 'undefined') ? localStorage.getItem('eql:profile') || undefined : undefined;
  const resolved = (env || win || loc || 'LIVE').toString().toUpperCase();
  const finalVal: Profile = resolved === 'TEST' ? 'TEST' : 'LIVE';
  try { localStorage.setItem('eql:profile', finalVal); } catch {}
  return finalVal;
}

export const PROFILE: Profile = resolveProfile();
export const isLive = PROFILE === 'LIVE';
