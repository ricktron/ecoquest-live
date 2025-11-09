export type TileDef = {
  slug: string;
  label: string;
  emoji: string;
  ancestors: string[]; // iNat ancestor names or groups (for future validation)
  details: {
    whatCounts: string;
    examples: string[];
    photoTip: string;
    safety?: string;
  };
};

export type BingoTile = TileDef & { position: number }; // 0..24; position 12 is FREE

export type BingoBoard = {
  id: string;
  title: string;
  weekHint?: string; // e.g., "Nov 10–16, 2025"
  tiles: BingoTile[];
};
