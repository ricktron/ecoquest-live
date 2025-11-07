import { useEffect, useState } from 'react';
import { saveRuntimeConfig, loadRuntimeConfig, clearRuntimeConfig } from '../lib/runtimeConfig';
import { recreateSupabase } from '../lib/supabaseClient';
import { 
  pingBronze, adminAward, adminList, adminDelete, fetchUserLogins,
  fieldAward, adminSetSpeeds, adminSetAnnouncement, listRecentAwards, listWeeklyAwards,
  adminSetTrophiesIncludeAdults, adminSetStudentLogins, adminSetBlackoutUntil, fetchDisplayFlags
} from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Textarea } from './ui/textarea';

const K_ADMIN_TOKEN = 'eql.admin.token';

export default function ConfigModal({ open, onClose }: { open: boolean; onClose: () => void; }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<string>('');

  // Admin section
  const [adminToken, setAdminToken] = useState('');
  const [fieldToken, setFieldToken] = useState('');
  const [userLogins, setUserLogins] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [adminPoints, setAdminPoints] = useState(0);
  const [adminReason, setAdminReason] = useState('');
  const [fieldPoints, setFieldPoints] = useState(0);
  const [fieldReason, setFieldReason] = useState('');
  const [awards, setAwards] = useState<any[]>([]);
  const [adminStatus, setAdminStatus] = useState('');
  const [fieldStatus, setFieldStatus] = useState('');
  const [speedsStatus, setSpeedsStatus] = useState('');
  const [announceStatus, setAnnounceStatus] = useState('');
  const [primaryMs, setPrimaryMs] = useState(16000);
  const [announceMs, setAnnounceMs] = useState(26000);
  const [announceText, setAnnounceText] = useState('');
  const [recentAwards, setRecentAwards] = useState<any[]>([]);
  const [weeklyAwards, setWeeklyAwards] = useState<any[]>([]);
  const [includeAdults, setIncludeAdults] = useState(true);
  const [studentLogins, setStudentLogins] = useState('');
  const [blackoutUntil, setBlackoutUntil] = useState('');
  const [displayStatus, setDisplayStatus] = useState('');

  useEffect(() => {
    if (open) {
      const cfg = loadRuntimeConfig();
      setUrl(cfg.supabaseUrl || '');
      setKey(cfg.supabaseAnonKey || '');
      setStatus('');

      // Load admin token
      const token = localStorage.getItem(K_ADMIN_TOKEN) || '';
      const fToken = localStorage.getItem('eql.field.token') || '';
      setAdminToken(token);
      setFieldToken(fToken);
      setAdminStatus('');
      setFieldStatus('');

      // Load user logins
      fetchUserLogins().then(logins => {
        setUserLogins(logins);
        if (logins.length > 0) setSelectedUser(logins[0]);
      });

      // Load display flags
      fetchDisplayFlags().then(flags => {
        setIncludeAdults(flags.trophies_include_adults ?? true);
        setBlackoutUntil(flags.score_blackout_until || '');
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

  const saveFieldToken = () => {
    localStorage.setItem('eql.field.token', fieldToken.trim());
    setFieldStatus('Field token saved.');
  };

  const handleAdminAward = async () => {
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
      points: adminPoints,
      reason: adminReason.trim() || 'manual',
      by: 'admin'
    });
    if (r.error) {
      setAdminStatus('Award error: ' + r.error.message);
    } else {
      setAdminStatus('Points awarded successfully');
      setAdminPoints(0);
      setAdminReason('');
      recreateSupabase();
      await refreshAwards();
    }
  };

  const handleAdminDeduct = async () => {
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
      points: -1,
      reason: 'deduct-1',
      by: 'admin'
    });
    if (r.error) {
      setAdminStatus('Deduct error: ' + r.error.message);
    } else {
      setAdminStatus('Point deducted successfully');
      recreateSupabase();
      await refreshAwards();
    }
  };

  const handleFieldAward = async () => {
    if (!fieldToken.trim()) {
      setFieldStatus('Error: Field token required');
      return;
    }
    if (!selectedUser) {
      setFieldStatus('Error: Select a user');
      return;
    }
    if (Math.abs(fieldPoints) > 10) {
      setFieldStatus('Error: Field awards must be ≤10 points');
      return;
    }
    const r = await fieldAward({
      token: fieldToken.trim(),
      user_login: selectedUser,
      points: fieldPoints,
      reason: fieldReason.trim() || 'field-award',
      by: 'guide'
    });
    if (r.error) {
      setFieldStatus('Award error: ' + r.error.message);
    } else {
      setFieldStatus('Points awarded successfully');
      setFieldPoints(0);
      setFieldReason('');
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

  const handleSaveSpeeds = async () => {
    if (!adminToken.trim()) {
      setSpeedsStatus('Error: Admin token required');
      return;
    }
    const r = await adminSetSpeeds({ token: adminToken.trim(), primary_ms: primaryMs, announce_ms: announceMs });
    if (r.error) {
      setSpeedsStatus('Error: ' + r.error.message);
    } else {
      setSpeedsStatus('Speeds saved successfully');
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!adminToken.trim()) {
      setAnnounceStatus('Error: Admin token required');
      return;
    }
    const r = await adminSetAnnouncement({ token: adminToken.trim(), text: announceText });
    if (r.error) {
      setAnnounceStatus('Error: ' + r.error.message);
    } else {
      setAnnounceStatus('Announcement saved successfully');
    }
  };

  const loadLogs = async () => {
    const r1 = await listRecentAwards();
    const r2 = await listWeeklyAwards();
    if (r1.data) setRecentAwards(r1.data);
    if (r2.data) setWeeklyAwards(r2.data);
  };

  const handleSaveIncludeAdults = async () => {
    if (!adminToken.trim()) {
      setDisplayStatus('Error: Admin token required');
      return;
    }
    const r = await adminSetTrophiesIncludeAdults(adminToken.trim(), includeAdults);
    if (r.error) {
      setDisplayStatus('Error: ' + r.error.message);
    } else {
      setDisplayStatus('Adult toggle saved successfully');
    }
  };

  const handleSaveStudentLogins = async () => {
    if (!adminToken.trim()) {
      setDisplayStatus('Error: Admin token required');
      return;
    }
    const logins = studentLogins.split('\n').map(s => s.trim()).filter(Boolean);
    const r = await adminSetStudentLogins(adminToken.trim(), logins.length > 0 ? logins : null);
    if (r.error) {
      setDisplayStatus('Error: ' + r.error.message);
    } else {
      setDisplayStatus('Student logins saved successfully');
    }
  };

  const handleSaveBlackout = async () => {
    if (!adminToken.trim()) {
      setDisplayStatus('Error: Admin token required');
      return;
    }
    const r = await adminSetBlackoutUntil(adminToken.trim(), blackoutUntil.trim() || null);
    if (r.error) {
      setDisplayStatus('Error: ' + r.error.message);
    } else {
      setDisplayStatus('Blackout saved successfully');
    }
  };

  if (!open) return null;
  return (
    <div className="cfg__backdrop" onClick={onClose}>
      <div className="cfg__modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Configuration</h3>
          <button onClick={onClose} className="ghost">Close</button>
        </div>

        <Tabs defaultValue="connection">
          <TabsList className="w-full">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="logs" onClick={loadLogs}>Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="connection">
            <h4>Supabase Connection</h4>
            <label>
              URL <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
            </label>
            <label>
              Anon Key <input value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOi..." />
            </label>
            <div className="cfg__row">
              <button onClick={test}>Save & Test</button>
              <button onClick={reset} className="secondary">Clear</button>
            </div>
            <pre className="cfg__status">{status}</pre>
          </TabsContent>

          <TabsContent value="display">
            <div className="cfg__section">
              <h4>Display Settings (Admin)</h4>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={includeAdults}
                  onChange={e => setIncludeAdults(e.target.checked)}
                />
                Include adults in trophies
              </label>
              <div className="cfg__row">
                <button onClick={handleSaveIncludeAdults}>Save Adult Toggle</button>
              </div>

              <label style={{ marginTop: '1rem' }}>
                Student Logins (one per line)
                <Textarea
                  value={studentLogins}
                  onChange={e => setStudentLogins(e.target.value)}
                  placeholder="student1&#10;student2&#10;student3"
                  rows={5}
                />
              </label>
              <div className="cfg__row">
                <button onClick={handleSaveStudentLogins}>Save Student Logins</button>
              </div>

              <label style={{ marginTop: '1rem' }}>
                Scoreboard Blackout Until (ISO datetime)
                <input
                  type="datetime-local"
                  value={blackoutUntil ? blackoutUntil.slice(0, 16) : ''}
                  onChange={e => setBlackoutUntil(e.target.value ? e.target.value + ':00Z' : '')}
                  placeholder="2025-12-31T23:59"
                />
              </label>
              <div className="cfg__row">
                <button onClick={handleSaveBlackout}>Save Blackout</button>
              </div>

              <div className="cfg__section" style={{ marginTop: '1.5rem' }}>
                <h4>Ticker Speeds</h4>
                <label>
                  Primary Ticker (ms)
                  <input
                    type="number"
                    value={primaryMs}
                    onChange={e => setPrimaryMs(Number(e.target.value))}
                    placeholder="16000"
                  />
                </label>
                <label>
                  Announce Ticker (ms)
                  <input
                    type="number"
                    value={announceMs}
                    onChange={e => setAnnounceMs(Number(e.target.value))}
                    placeholder="26000"
                  />
                </label>
                <div className="cfg__row">
                  <button onClick={handleSaveSpeeds}>Save Speeds</button>
                </div>
                <pre className="cfg__status">{speedsStatus}</pre>
              </div>

              <div className="cfg__section" style={{ marginTop: '1.5rem' }}>
                <h4>Announcement Text</h4>
                <label>
                  Announcement
                  <Textarea
                    value={announceText}
                    onChange={e => setAnnounceText(e.target.value)}
                    placeholder="Enter announcement text"
                    rows={3}
                  />
                </label>
                <div className="cfg__row">
                  <button onClick={handleSaveAnnouncement}>Save Announcement</button>
                </div>
                <pre className="cfg__status">{announceStatus}</pre>
              </div>

              <pre className="cfg__status">{displayStatus}</pre>
            </div>
          </TabsContent>

          <TabsContent value="points">
            {/* Admin subsection */}
            <div className="cfg__section">
              <h4>Admin Awards</h4>
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
                  value={adminPoints}
                  onChange={e => setAdminPoints(Number(e.target.value))}
                  placeholder="0"
                />
              </label>

              <label>
                Reason (optional)
                <input
                  value={adminReason}
                  onChange={e => setAdminReason(e.target.value)}
                  placeholder="manual"
                />
              </label>

              <div className="cfg__row">
                <button onClick={handleAdminAward}>Award</button>
                <button onClick={handleAdminDeduct} className="secondary">Deduct 1</button>
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

            {/* Field subsection */}
            <div className="cfg__section">
              <h4>Field Awards</h4>
              <label>
                Field Token
                <input
                  type="password"
                  value={fieldToken}
                  onChange={e => setFieldToken(e.target.value)}
                  placeholder="Enter field token"
                />
              </label>
              <div className="cfg__row">
                <button onClick={saveFieldToken} className="secondary">Save Token</button>
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
                Points (max ±10)
                <input
                  type="number"
                  value={fieldPoints}
                  onChange={e => setFieldPoints(Math.max(-10, Math.min(10, Number(e.target.value))))}
                  placeholder="0"
                  min="-10"
                  max="10"
                />
              </label>

              <label>
                Reason (optional)
                <input
                  value={fieldReason}
                  onChange={e => setFieldReason(e.target.value)}
                  placeholder="field-award"
                />
              </label>

              <div className="cfg__row">
                <button onClick={handleFieldAward}>Award</button>
              </div>

              <pre className="cfg__status">{fieldStatus}</pre>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <h4>Recent Awards (Last 7 Days)</h4>
            {recentAwards.length > 0 ? (
              <table className="cfg__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Points</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAwards.map((award: any, idx: number) => (
                    <tr key={idx}>
                      <td>{new Date(award.awarded_at).toLocaleDateString()}</td>
                      <td>{award.user_login}</td>
                      <td>{award.points}</td>
                      <td>{award.reason}</td>
                      <td>{award.awarded_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No recent awards</p>
            )}

            <h4 style={{ marginTop: '1.5rem' }}>Weekly Summary</h4>
            {weeklyAwards.length > 0 ? (
              <table className="cfg__table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>User</th>
                    <th>Total Points</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyAwards.map((award: any, idx: number) => (
                    <tr key={idx}>
                      <td>{award.week_start}</td>
                      <td>{award.user_login}</td>
                      <td>{award.total_points}</td>
                      <td>{award.award_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No weekly data</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
