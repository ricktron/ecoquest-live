import { create } from 'zustand';

export type BBox = {
  swLat: number;
  swLon: number;
  neLat: number;
  neLon: number;
};

export type DateRange = {
  from: Date;
  to: Date;
};

type FiltersStore = {
  bbox: BBox | null;
  dateRange: DateRange;
  qg: string[];
  logins: string[];
  version: number;
  setBbox: (bbox: BBox) => void;
  setDateRange: (range: DateRange) => void;
  setQg: (qg: string[]) => void;
  setLogins: (logins: string[]) => void;
  reset: () => void;
  bumpVersion: () => void;
};

const defaultDateRange = (): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
};

export const useFilters = create<FiltersStore>((set) => ({
  bbox: null,
  dateRange: defaultDateRange(),
  qg: ['research', 'needs_id', 'casual'],
  logins: [],
  version: 0,
  setBbox: (bbox) => set({ bbox }),
  setDateRange: (dateRange) => set({ dateRange, version: (state) => state.version + 1 }),
  setQg: (qg) => set({ qg, version: (state) => state.version + 1 }),
  setLogins: (logins) => set({ logins, version: (state) => state.version + 1 }),
  reset: () => set({
    dateRange: defaultDateRange(),
    qg: ['research', 'needs_id', 'casual'],
    logins: [],
    version: (state) => state.version + 1
  }),
  bumpVersion: () => set((state) => ({ version: state.version + 1 }))
}));
