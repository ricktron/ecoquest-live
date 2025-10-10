export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const ASSIGNMENT_ID = (import.meta.env.VITE_DEFAULT_ASSIGNMENT_ID as string) ?? "";
export const REFRESH_MS = Number(import.meta.env.VITE_REFRESH_MS ?? 45000);

if (!SUPA_URL || !SUPA_KEY || !ASSIGNMENT_ID) {
  // eslint-disable-next-line no-console
  console.warn("Missing env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_DEFAULT_ASSIGNMENT_ID");
}

type Opts = { signal?: AbortSignal };
export async function sfetch<T=unknown>(path: string, opts: Opts = {}): Promise<T> {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    signal: opts.signal
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export function q(params: Record<string,string|number|boolean|undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v === undefined) return;
    sp.append(k, String(v));
  });
  return sp.toString();
}
