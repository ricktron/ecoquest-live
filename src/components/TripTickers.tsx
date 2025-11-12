import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { getTickerLeadersCR2025, getTickerTripWindow, lastUpdatedCR2025 } from '@/lib/api';

type TickerItem = string | { text: string; href?: string; icon?: React.ReactNode };

type TickerProps = {
  items?: TickerItem[];
  ariaLabel?: string;
  pauseOnHover?: boolean;
  className?: string;
};

const DEFAULT_FALLBACK_TEXT = 'EcoQuest Live';
const MIN_REPEAT = 3;

function renderItem(item: TickerItem, idx: number) {
  if (typeof item === 'string') {
    return (
      <span key={idx} className="mx-6 whitespace-nowrap">
        {item}
      </span>
    );
  }

  const content = (
    <span className="inline-flex items-center gap-2 mx-6 whitespace-nowrap">
      {item.icon ?? null}
      {item.text}
    </span>
  );

  return item.href ? (
    <a key={idx} href={item.href} className="underline hover:opacity-80">
      {content}
    </a>
  ) : (
    <span key={idx}>{content}</span>
  );
}

function duplicateItems<T>(source: T[], repeat = MIN_REPEAT): T[] {
  if (!source.length) return [];
  return Array.from({ length: repeat }).flatMap(() => source);
}

function useTripTickerItems(providedItems?: TickerItem[]): TickerItem[] {
  const tripWindowString = useMemo(() => getTickerTripWindow(), []);
  const [baseItems, setBaseItems] = useState<TickerItem[]>(() => {
    if (providedItems && providedItems.length > 0) {
      return providedItems;
    }
    return [];
  });

  useEffect(() => {
    if (providedItems && providedItems.length > 0) {
      setBaseItems(providedItems);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [leadersResult, updatedResult] = await Promise.all([
          getTickerLeadersCR2025(),
          lastUpdatedCR2025(),
        ]);

        if (cancelled) return;

        if (leadersResult.error) {
          console.error('Failed to fetch ticker leaders', leadersResult.error);
        }
        if (updatedResult.error) {
          console.error('Failed to fetch ticker updated timestamp', updatedResult.error);
        }

        const leaderLineRaw =
          (leadersResult.data ?? []).find(
            (value) => typeof value === 'string' && value.trim().length > 0,
          ) ?? '';

        const leaderLine = leaderLineRaw.trim();
        if (!leaderLine) {
          setBaseItems([DEFAULT_FALLBACK_TEXT]);
          return;
        }

        const iso = updatedResult.data ?? null;
        let updatedAtString = 'Updated recently';
        if (iso) {
          const dt = new Date(iso);
          if (!Number.isNaN(dt.valueOf())) {
            updatedAtString = `Updated ${formatDistanceToNow(dt, { addSuffix: true })}`;
          }
        }

        const assembled: TickerItem[] = [leaderLine, '•', tripWindowString, '•', updatedAtString];
        setBaseItems(assembled);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load trip ticker items', error);
          setBaseItems([DEFAULT_FALLBACK_TEXT]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [providedItems, tripWindowString]);

  return useMemo(() => {
    const source = baseItems.length > 0 ? baseItems : [DEFAULT_FALLBACK_TEXT];
    return duplicateItems(source);
  }, [baseItems]);
}

const TickerBase: React.FC<TickerProps> = ({
  items = [],
  ariaLabel = 'ticker',
  pauseOnHover = true,
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div
      aria-label={ariaLabel}
      className={`relative w-full overflow-hidden border-t border-b border-neutral-800 bg-neutral-950/60 ${className}`}
    >
      <div className={`flex animate-marquee will-change-transform ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}>
        <div className="flex shrink-0 py-2">
          {items.map(renderItem)}
        </div>
        <div className="flex shrink-0 py-2" aria-hidden="true">
          {items.map(renderItem)}
        </div>
      </div>
    </div>
  );
};

export const TripNewsTicker: React.FC<TickerProps> = ({ items: providedItems, ariaLabel = 'trip-news-ticker', ...rest }) => {
  const items = useTripTickerItems(providedItems);
  if (items.length === 0) return null;
  return <TickerBase items={items} ariaLabel={ariaLabel} {...rest} />;
};

export const TripInfoTicker: React.FC<TickerProps> = ({ items: providedItems, ariaLabel = 'trip-info-ticker', ...rest }) => {
  const items = useTripTickerItems(providedItems);
  if (items.length === 0) return null;
  return <TickerBase items={items} ariaLabel={ariaLabel} {...rest} />;
};

const TripTickers: React.FC<{
  news?: TickerItem[];
  info?: TickerItem[];
  className?: string;
}> = ({ news = [], info = [], className = '' }) => {
  return (
    <div className={className}>
      <TripNewsTicker items={news} />
      <TripInfoTicker items={info} />
    </div>
  );
};

export default TripTickers;
