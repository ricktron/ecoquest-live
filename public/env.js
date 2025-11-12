// Runtime environment override (optional)
// Uncomment and set values to override without rebuilding
// globalThis.__SUPABASE_URL__ = 'https://fceyhhzufkcqkjrjbdwl.supabase.co';
// globalThis.__SUPABASE_ANON_KEY__ = 'your-anon-key';

// EQL profile (LIVE or TEST)
window.__EQL = window.__EQL || {};
window.__EQL.PROFILE = window.__EQL.PROFILE || 'LIVE';
window.__ENV = window.__ENV || { VITE_FEATURE_TICKERS: "0" };
if (typeof window.__ENV.VITE_FEATURE_TICKERS === "undefined") {
  window.__ENV.VITE_FEATURE_TICKERS = "0";
}
