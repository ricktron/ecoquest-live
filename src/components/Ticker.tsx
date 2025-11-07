type Props = { 
  text: string; 
  variant?: 'primary' | 'announce';
  speedMs?: number;
};

export default function Ticker({ text, variant = 'primary', speedMs = 18000 }: Props) {
  // Two lanes with identical width → transform(-50%) is a perfect wrap
  return (
    <div 
      className={`ticker ${variant}`} 
      data-role={variant === 'announce' ? 'announce-ticker' : 'ticker'}
    >
      <div className="ticker__lane" style={{ ['--ticker-duration' as any]: `${speedMs}ms` }}>
        <div className="ticker__content">{text}</div>
        <div className="ticker__content" aria-hidden>{text}</div>
      </div>
    </div>
  );
}
