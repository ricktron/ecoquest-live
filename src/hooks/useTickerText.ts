import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/lib/api';

export function useTickerText(): string | undefined {
  const [text, setText] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await fetchLeaderboard();
      if (cancelled) return;
      if (data && data.length) {
        const top = data.slice(0, 3).map(r => r.user_login).join(', ');
        setText(`Leaders: ${top}`);
      } else {
        // Fallback message so the primary ticker still renders
        setText('EcoQuest Live — ready to play');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return text;
}
