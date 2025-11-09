import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BingoTile } from "./types";

export function BingoTile({ tile }: { tile: BingoTile }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="group aspect-square rounded-2xl border border-border grid place-items-center bg-card p-1 sm:p-2 relative overflow-hidden hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-label={`${tile.label} details`}
          title="Tap for details"
        >
          <div className="grid gap-1 place-items-center">
            <span className="leading-none text-[clamp(24px,7.5vw,48px)] sm:text-4xl md:text-5xl">
              {tile.emoji}
            </span>
            <span
              className={`
                max-w-full
                text-[clamp(9px,2.2vw,12px)] sm:text-xs md:text-sm
                font-medium text-foreground text-center
                leading-tight
                break-normal whitespace-normal hyphens-none
                ${tile.slug === "free" ? "uppercase font-bold" : ""}
              `}
            >
              {tile.label}
            </span>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="max-w-[92vw] sm:w-80 text-sm"
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={12}
      >
        <h3 className="font-semibold">{tile.label}</h3>
        {tile.details.whatCounts && (
          <p className="mt-1">
            <span className="font-semibold">What counts:</span> {tile.details.whatCounts}
          </p>
        )}
        {tile.details.examples?.length > 0 && (
          <p className="mt-1">
            <span className="font-semibold">Examples:</span> {tile.details.examples.join(", ")}
          </p>
        )}
        {tile.details.photoTip && (
          <p className="mt-1">
            <span className="font-semibold">Photo tip:</span> {tile.details.photoTip}
          </p>
        )}
        {tile.details.safety && (
          <p className="mt-1 text-red-700">
            <span className="font-semibold">Safety:</span> {tile.details.safety}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
