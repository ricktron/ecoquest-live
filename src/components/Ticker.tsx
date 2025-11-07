import { useLayoutEffect, useRef, useState } from 'react';

type Props = { 
  text: string; 
  variant?: 'primary' | 'announce'; 
};

export default function Ticker({ text, variant = 'primary' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(4);

  useLayoutEffect(() => {
    const wrap = wrapRef.current, track = trackRef.current;
    if (!wrap || !track) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const t = Array.from(track.children).reduce((s, c) => s + (c as HTMLElement).offsetWidth, 0);
      // ensure track width >= 3x container for seamless loop
      const need = Math.max(4, Math.ceil((3 * w) / Math.max(1, t / copies)));
      setCopies(need);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text, copies]);

  return (
    <div 
      className={`ticker ${variant}`} 
      role="status" 
      aria-live="polite"
      data-role={variant === 'announce' ? 'announce-ticker' : 'ticker'}
    >
      <div className="ticker__inner" ref={wrapRef} data-speed={variant === 'announce' ? 'slow' : 'fast'}>
        <div className="ticker__track" ref={trackRef}>
          {Array.from({ length: copies }).map((_, i) => (
            <span className="ticker__chunk" key={i} aria-hidden={i > 0 ? "true" : undefined}>
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
