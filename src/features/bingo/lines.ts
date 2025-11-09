/**
 * Bingo line definitions and score computation
 */

// 12 winning lines: 5 rows, 5 columns, 2 diagonals
export const LINES: number[][] = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

export interface BingoScore {
  lines: number;
  blackout: boolean;
  claimed: number;
}

/**
 * Compute lines, blackout status, and claimed count
 * Position 12 (FREE) is auto-complete and not counted in claimed/blackout
 */
export function computeScore(claimedPositions: Set<number>): BingoScore {
  const pos = new Set([...claimedPositions, 12]); // FREE is always claimed
  
  const lines = LINES.filter(line => 
    line.every(p => pos.has(p))
  ).length;
  
  // Blackout = all 24 non-FREE tiles claimed
  const nonFreePositions = Array.from({ length: 25 }, (_, i) => i).filter(p => p !== 12);
  const blackout = nonFreePositions.every(p => pos.has(p));
  
  // Claimed count excludes FREE
  const claimed = [...claimedPositions].filter(p => p !== 12).length;
  
  return { lines, blackout, claimed };
}
