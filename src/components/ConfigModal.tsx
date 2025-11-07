import { useEffect, useState } from 'react';
import { saveRuntimeConfig, loadRuntimeConfig, clearRuntimeConfig } from '../lib/runtimeConfig';
import { recreateSupabase } from '../lib/supabaseClient';
import { pingBronze } from '../lib/api';

export default function ConfigModal({ open, onClose }: { open: boolean; onClose: () => void; }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (open) {
      const cfg = loadRuntimeConfig();
      setUrl(cfg.supabaseUrl || '');
      setKey(cfg.supabaseAnonKey || '');
      setStatus('');
    }
  }, [open]);

  const test = async () => {
    saveRuntimeConfig({ supabaseUrl: url.trim(), supabaseAnonKey: key.trim() });
    recreateSupabase();
    const r = await pingBronze();
    if ((r as any).error) setStatus('Error: ' + (r as any).error.message);
    else setStatus('OK: ' + JSON.stringify(r.data));
  };

  const reset = () => {
    clearRuntimeConfig();
    recreateSupabase();
    setStatus('Cleared overrides.');
  };

  if (!open) return null;
  return (
    <div className="cfg__backdrop" onClick={onClose}>
      <div className="cfg__modal" onClick={e => e.stopPropagation()}>
        <h3>Supabase Connection</h3>
        <label>
          URL <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
        </label>
        <label>
          Anon Key <input value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOi..." />
        </label>
        <div className="cfg__row">
          <button onClick={test}>Save & Test</button>
          <button onClick={reset} className="secondary">Clear</button>
          <button onClick={onClose} className="ghost">Close</button>
        </div>
        <pre className="cfg__status">{status}</pre>
      </div>
    </div>
  );
}
