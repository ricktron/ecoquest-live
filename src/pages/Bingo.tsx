import { useState, useEffect } from 'react';
import { fetchBingo, fetchUserLogins } from '../lib/api';

type BingoCell = {
  label: string;
  hit: boolean;
};

export default function Bingo() {
  const [userLogins, setUserLogins] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [cells, setCells] = useState<BingoCell[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const logins = await fetchUserLogins();
      if (!mounted) return;
      setUserLogins(logins);
      if (logins.length > 0) setSelectedUser(logins[0]);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const data = await fetchBingo(selectedUser);
      if (!mounted) return;
      setCells(data);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [selectedUser]);

  return (
    <div className="page">
      <h1 className="text-2xl font-bold mb-4">Bingo</h1>
      
      <div className="mb-6">
        <label htmlFor="user-select" className="block text-sm font-medium mb-2">
          Select User
        </label>
        <select
          id="user-select"
          className="w-full p-2 border rounded-lg"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          {userLogins.map((login) => (
            <option key={login} value={login}>
              {login}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading bingo board...</div>
      ) : cells.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No bingo data available</div>
      ) : (
        <div className="bingo">
          <div className="bingo__grid">
            {cells.map((cell, i) => (
              <div
                key={i}
                className={`bingo__cell ${cell.hit ? 'hit' : ''}`}
              >
                {cell.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
