import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { getTop3ForTickerCR2025, getTickerTripWindow, lastUpdatedCR2025 } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

type TickerTextItem = {
  text: string;
  href?: string;
  icon?: React.ReactNode;
  className?: string;
};

type TickerItem = string | TickerTextItem;
type NormalizedTickerItem = TickerTextItem;

type TripTickerProps = {
  items?: TickerItem[];
  ariaLabel?: string;
  pauseOnHover?: boolean;
  className?: string;
  debug?: React.ReactNode;
};

const DEFAULT_FALLBACK_TEXT = 'EcoQuest Live';
const OVERFLOW_RATIO = 1.5;

function makeSeparatorItem(): NormalizedTickerItem {
  return {
    text: '',
    icon: <span className="opacity-50 px-2">•</span>,
    className: 'mx-0 gap-0',
  };
}

function normalizeItems(items: TickerItem[]): NormalizedTickerItem[] {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return null;
        return { text: trimmed } satisfies NormalizedTickerItem;
      }

      const text = item.text ?? '';
      if (!text && !item.icon) return null;

      return {
        text,
        href: item.href,
        icon: item.icon,
        className: item.className,
      } satisfies NormalizedTickerItem;
    })
    .filter((value): value is NormalizedTickerItem => Boolean(value));
}

function renderNormalizedItem(item: NormalizedTickerItem, idx: number) {
  const { text, href, icon, className } = item;
  const spacing = className ?? 'mx-6';
  const contentClass = `inline-flex items-center gap-2 whitespace-nowrap ${spacing}`.trim();
  const content = (
    <span className={contentClass}>
      {icon ?? null}
      {text}
    </span>
  );

  if (href) {
    return (
      <a key={idx} href={href} className="underline hover:opacity-80">
        {content}
      </a>
    );
  }

  return (
    <span key={idx}>
      {content}
    </span>
  );
}

function extendWithCycle(current: NormalizedTickerItem[], base: NormalizedTickerItem[]): NormalizedTickerItem[] {
  if (base.length === 0) return current;
  const next = current.slice();
  if (next.length > 0) {
    next.push(makeSeparatorItem());
  }
  return next.concat(base);
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
        const client = supabase();
        const [topThree, updatedResult] = await Promise.all([
          getTop3ForTickerCR2025(client),
          lastUpdatedCR2025(),
        ]);

        if (cancelled) return;

        if (updatedResult.error) {
          console.error('Failed to fetch ticker updated timestamp', updatedResult.error);
        }

        const names = topThree.map((name) => name.trim()).filter((name) => name.length > 0);
        const leaderLine = names.length > 0 ? `leaders: ${names.join(', ')}` : '';

        const iso = updatedResult.data ?? null;
        let updatedAtString = 'Updated recently';
        if (iso) {
          const dt = new Date(iso);
          if (!Number.isNaN(dt.valueOf())) {
            updatedAtString = `Updated ${formatDistanceToNow(dt, { addSuffix: true })}`;
          }
        }

        const segments: TickerItem[] = leaderLine
          ? [{ text: leaderLine }, { text: tripWindowString }, { text: updatedAtString }]
          : [{ text: tripWindowString }, { text: updatedAtString }];

        const assembled = segments.flatMap((segment, index) =>
          index > 0 ? [makeSeparatorItem(), segment] : [segment],
        );

        setBaseItems(assembled.length > 0 ? assembled : [DEFAULT_FALLBACK_TEXT]);
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
    return baseItems.length > 0 ? baseItems : [DEFAULT_FALLBACK_TEXT];
  }, [baseItems]);
}

const TripTicker: React.FC<TripTickerProps> = ({
  items: providedItems,
  ariaLabel = 'trip-info-ticker',
  pauseOnHover = true,
  className = '',
  debug = null,
}) => {
  const items = useTripTickerItems(providedItems);
  const normalized = useMemo(() => normalizeItems(items), [items]);
  const [extendedItems, setExtendedItems] = useState<NormalizedTickerItem[]>(normalized);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useLayoutEffect(() => {
    setExtendedItems(normalized);
  }, [normalized]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    if (normalized.length === 0) return;

    const measuredWidth = container.getBoundingClientRect().width || viewportWidth;
    const targetWidth = measuredWidth > 0 ? measuredWidth * OVERFLOW_RATIO : 0;
    if (targetWidth === 0) return;

    const contentWidth = content.scrollWidth;
    if (contentWidth === 0 || contentWidth >= targetWidth) {
      return;
    }

    const baseItems = normalized.length > 0 ? normalized : [{ text: DEFAULT_FALLBACK_TEXT }];
    const currentItems = extendedItems.length > 0 ? extendedItems : baseItems;
    const nextItems = extendWithCycle(currentItems, baseItems);
    if (nextItems.length !== extendedItems.length) {
      setExtendedItems(nextItems);
    }
  }, [normalized, extendedItems, viewportWidth]);

  if (extendedItems.length === 0) return null;

  return (
    <>
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        className={`relative w-full overflow-hidden border-t border-b border-emerald-800 bg-emerald-950/80 text-emerald-50 ${className}`}
      >
        <div
          className={`flex animate-marquee will-change-transform ${
            pauseOnHover ? 'hover:[animation-play-state:paused]' : ''
          }`}
        >
          <div className="flex shrink-0 py-2" ref={contentRef}>
            {extendedItems.map(renderNormalizedItem)}
          </div>
          <div className="flex shrink-0 py-2" aria-hidden="true">
            {extendedItems.map(renderNormalizedItem)}
          </div>
        </div>
      </div>
      {debug ?? null}
    </>
  );
};

export default TripTicker;
