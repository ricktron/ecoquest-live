type Props = { 
  text: string; 
  variant?: 'primary' | 'announce';
  speedMs?: number;
};

export default function Ticker({ text, variant = 'primary', speedMs = 18000 }: Props) {
  // Duplicate items with bullet dividers for seamless loop
  const items = [text, text];
  
  return (
    <div 
      className={`ticker ${variant}`} 
      data-role={variant === 'announce' ? 'announce-ticker' : 'ticker'}
      style={{ 
        ['--gap' as any]: '2rem',
        ['--speed-ms' as any]: `${speedMs}ms`
      }}
    >
      <div 
        className="ticker__lane" 
        style={{ 
          animation: `marquee ${speedMs}ms linear infinite`,
          display: 'flex',
          gap: 'var(--gap)',
        }}
      >
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap)' }}>
            <div className="ticker__content whitespace-nowrap">{item}</div>
            <span className="ticker__divider" aria-hidden>•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
