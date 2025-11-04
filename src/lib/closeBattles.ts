// Find close point battles in the leaderboard

import { UI } from '@/uiConfig';
import { UserScore } from './scoring';

export type CloseBattle = {
  a: UserScore & { rank: number };
  b: UserScore & { rank: number };
  d: number;
};

export function findCloseBattles(
  rows: (UserScore & { rank: number })[],
  gap = UI.closeGapThreshold
): CloseBattle[] {
  const battles: CloseBattle[] = [];
  
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    const d = +(Math.abs(a.points - b.points)).toFixed(2);
    
    if (d <= gap) {
      battles.push({ a, b, d });
    }
  }
  
  // Prefer top battle (rank 1 vs 2), any podium battle (2 vs 3),
  // and the largest cluster anywhere (smallest d in the rest).
  const top = battles.find(x => x.a.rank === 1);
  const podium = battles.find(x => x.a.rank === 2);
  const rest = battles.filter(x => x !== top && x !== podium).sort((x, y) => x.d - y.d)[0];
  
  return [top, podium, rest].filter(Boolean).slice(0, UI.maxCloseClusters);
}
