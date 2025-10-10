export const fmtPts = (n?: number|null) => (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
export const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
export const short = (s?: string|null) => s ?? "";
export function pickPoints(row: any): number {
  return Number(row?.total_points ?? row?.points ?? 0);
}
