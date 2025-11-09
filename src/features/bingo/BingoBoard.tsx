import { BINGO_BOARD_THIS_WEEK } from "./tiles";
import { BingoTile } from "./BingoTile";

export default function BingoBoard() {
  // Ensure the FREE tile is at grid center (position 12).
  const tiles = [...BINGO_BOARD_THIS_WEEK.tiles].sort((a, b) => a.position - b.position);

  // Simple guard in case of bad config
  if (tiles.length !== 25 || tiles[12].slug !== "free") {
    console.warn("Bingo board misconfigured; expected 25 tiles with FREE at position 12.");
  }

  return (
    <div className="page">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{BINGO_BOARD_THIS_WEEK.title}</h1>
        {BINGO_BOARD_THIS_WEEK.weekHint && (
          <p className="text-sm text-muted-foreground">{BINGO_BOARD_THIS_WEEK.weekHint}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Tap an emoji for "What counts / Examples / Photo tip".
        </p>
      </header>

      <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 max-w-full px-2 sm:px-3 sm:max-w-3xl mx-auto">
        {tiles.map((t) => (
          <BingoTile key={t.slug + t.position} tile={t} />
        ))}
      </div>
    </div>
  );
}
