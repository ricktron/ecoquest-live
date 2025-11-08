#!/usr/bin/env node
(async () => {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  const hostRef = new URL(url).host.split('.')[0];
  let keyRef = '';
  try {
    const b64 = (key.split('.')[1] || '');
    keyRef = JSON.parse(Buffer.from(b64, 'base64').toString()).ref || '';
  } catch {}
  if (keyRef && keyRef !== hostRef) {
    console.error(`❌ URL/key mismatch: url=${hostRef} key=${keyRef}`);
    process.exit(1);
  }
  const f = globalThis.fetch ?? (await import('node-fetch')).default;
  const r = await f(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (r.status !== 200) {
    console.error(`❌ Auth probe failed: ${r.status}`);
    process.exit(1);
  }
  console.log(`✅ Supabase env OK: ${hostRef}`);
})();
