import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BingoTile } from "./types";

export function BingoTile({ tile }: { tile: BingoTile }) {
  const isFree = tile.slug === "free";
  return (
    <div className="aspect-square rounded-2xl border border-border grid place-items-center bg-card p-2 hover:bg-accent/50 transition-colors">
      <div className="grid gap-1 place-items-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="text-4xl leading-none hover:scale-110 transition-transform"
              aria-label={`${tile.label} details`}
              title="Tap for details"
            >
              <span>{tile.emoji}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm">
            <h3 className="font-semibold text-lg mb-2">{tile.label}</h3>
            {tile.details.whatCounts && (
              <p className="mt-2"><span className="font-semibold text-primary">What counts:</span> {tile.details.whatCounts}</p>
            )}
            {tile.details.examples?.length > 0 && (
              <p className="mt-2">
                <span className="font-semibold text-primary">Examples:</span> {tile.details.examples.join(", ")}
              </p>
            )}
            {tile.details.photoTip && (
              <p className="mt-2"><span className="font-semibold text-primary">Photo tip:</span> {tile.details.photoTip}</p>
            )}
            {tile.details.safety && (
              <p className="mt-2 text-destructive">
                <span className="font-semibold">Safety:</span> {tile.details.safety}
              </p>
            )}
          </PopoverContent>
        </Popover>
        <span className={`text-xs font-medium text-foreground text-center ${isFree ? "uppercase font-bold" : ""}`}>
          {tile.label}
        </span>
      </div>
    </div>
  );
}
