import { useEffect, useState } from 'react';
import { saveRuntimeConfig, loadRuntimeConfig, clearRuntimeConfig } from '../lib/runtimeConfig';
import { recreateSupabase } from '../lib/supabaseClient';
import { pingBronze, adminAward, adminList, adminDelete, fetchUserLogins } from '../lib/api';

const K_ADMIN_TOKEN = 'eql.admin.token';

export default function ConfigModal({ open, onClose }: { open: boolean; onClose: () => void; }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<string>('');

  // Admin section
  const [adminToken, setAdminToken] = useState('');
  const [userLogins, setUserLogins] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState('');
  const [awards, setAwards] = useState<any[]>([]);
  const [adminStatus, setAdminStatus] = useState('');

  useEffect(() => {
    if (open) {
      const cfg = loadRuntimeConfig();
      setUrl(cfg.supabaseUrl || '');
      setKey(cfg.supabaseAnonKey || '');
      setStatus('');

      // Load admin token
      const token = localStorage.getItem(K_ADMIN_TOKEN) || '';
      setAdminToken(token);
      setAdminStatus('');

      // Load user logins
      fetchUserLogins().then(logins => {
        setUserLogins(logins);
        if (logins.length > 0) setSelectedUser(logins[0]);
      });
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

  const saveAdminToken = () => {
    localStorage.setItem(K_ADMIN_TOKEN, adminToken.trim());
    setAdminStatus('Admin token saved.');
  };

  const handleAward = async () => {
    if (!adminToken.trim()) {
      setAdminStatus('Error: Admin token required');
      return;
    }
    if (!selectedUser) {
      setAdminStatus('Error: Select a user');
      return;
    }
    const r = await adminAward({
      token: adminToken.trim(),
      user_login: selectedUser,
      points,
      reason: reason.trim() || 'manual',
      by: 'admin'
    });
    if (r.error) {
      setAdminStatus('Award error: ' + r.error.message);
    } else {
      setAdminStatus('Points awarded successfully');
      setPoints(0);
      setReason('');
      recreateSupabase();
      await refreshAwards();
    }
  };

  const refreshAwards = async () => {
    if (!adminToken.trim()) {
      setAdminStatus('Error: Admin token required');
      return;
    }
    const r = await adminList(adminToken.trim());
    if (r.error) {
      setAdminStatus('List error: ' + r.error.message);
      setAwards([]);
    } else {
      setAwards(r.data || []);
      setAdminStatus('List refreshed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this award?')) return;
    const r = await adminDelete(adminToken.trim(), id);
    if (r.error) {
      setAdminStatus('Delete error: ' + r.error.message);
    } else {
      setAdminStatus('Award deleted');
      recreateSupabase();
      await refreshAwards();
    }
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

        {/* Admin Section */}
        <div className="cfg__section">
          <h3>Admin</h3>
          <label>
            Admin Token
            <input
              type="password"
              value={adminToken}
              onChange={e => setAdminToken(e.target.value)}
              placeholder="Enter admin token"
            />
          </label>
          <div className="cfg__row">
            <button onClick={saveAdminToken} className="secondary">Save Token</button>
          </div>

          <label style={{ marginTop: '0.75rem' }}>
            User
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              {userLogins.map(login => (
                <option key={login} value={login}>{login}</option>
              ))}
            </select>
          </label>

          <label>
            Points
            <input
              type="number"
              value={points}
              onChange={e => setPoints(Number(e.target.value))}
              placeholder="0"
            />
          </label>

          <label>
            Reason (optional)
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="manual"
            />
          </label>

          <div className="cfg__row">
            <button onClick={handleAward}>Award</button>
            <button onClick={refreshAwards} className="secondary">Refresh List</button>
          </div>

          {awards.length > 0 && (
            <table className="cfg__table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Points</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {awards.map((award: any) => (
                  <tr key={award.id}>
                    <td>{award.user_login}</td>
                    <td>{award.points}</td>
                    <td>{award.reason}</td>
                    <td>
                      <span className="del" onClick={() => handleDelete(award.id)} title="Delete">
                        ✕
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <pre className="cfg__status">{adminStatus}</pre>
        </div>
      </div>
    </div>
  );
}
