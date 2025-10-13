export type ZoneDef = {
  key: string;
  label: string;
  sw: [number, number];
  ne: [number, number];
};

export const ZONES_DEFAULT: ZoneDef[] = [
  { key: 'river', label: 'On the River', sw: [9.950, -84.200], ne: [9.990, -84.150] },
  { key: 'beach', label: 'On the Beach', sw: [9.600, -85.000], ne: [9.640, -84.960] },
  { key: 'hotel', label: 'At the Hotel', sw: [9.800, -84.300], ne: [9.820, -84.280] },
];
