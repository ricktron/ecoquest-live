import React from "react";

type TickerItem = string | { text: string; href?: string; icon?: React.ReactNode };

type TickerProps = {
  items?: TickerItem[];
  ariaLabel?: string;
  pauseOnHover?: boolean;
  className?: string;
};

function renderItem(item: TickerItem, idx: number) {
  if (typeof item === "string") return <span key={idx} className="mx-6 whitespace-nowrap">{item}</span>;
  const content = (
    <span className="inline-flex items-center gap-2 mx-6 whitespace-nowrap">
      {item.icon ?? null}
      {item.text}
    </span>
  );
  return item.href ? (
    <a key={idx} href={item.href} className="underline hover:opacity-80">{content}</a>
  ) : (
    <span key={idx}>{content}</span>
  );
}

const TickerBase: React.FC<TickerProps> = ({ items = [], ariaLabel = "ticker", pauseOnHover = true, className = "" }) => {
  // Simple empty state: render nothing if no items
  if (!items || items.length === 0) return null;

  return (
    <div
      aria-label={ariaLabel}
      className={`relative w-full overflow-hidden border-t border-b border-neutral-800 bg-neutral-950/60 ${className}`}
    >
      <div className={`flex animate-marquee will-change-transform ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}>
        {/* first loop */}
        <div className="flex shrink-0 py-2">
          {items.map(renderItem)}
        </div>
        {/* seamless second loop */}
        <div className="flex shrink-0 py-2" aria-hidden="true">
          {items.map(renderItem)}
        </div>
      </div>
    </div>
  );
};

/** News ticker (top) */
export const TripNewsTicker: React.FC<TickerProps> = (props) => (
  <TickerBase ariaLabel="trip-news-ticker" {...props} />
);

/** Info ticker (bottom) */
export const TripInfoTicker: React.FC<TickerProps> = (props) => (
  <TickerBase ariaLabel="trip-info-ticker" {...props} />
);

/** Optional default wrapper that can render both tickers if needed */
const TripTickers: React.FC<{
  news?: TickerItem[];
  info?: TickerItem[];
  className?: string;
}> = ({ news = [], info = [], className = "" }) => {
  return (
    <div className={className}>
      <TripNewsTicker items={news} />
      <TripInfoTicker items={info} />
    </div>
  );
};

export default TripTickers;
