type Props = { 
  text: string; 
  variant?: 'primary' | 'announce'; 
};

export default function Ticker({ text, variant = 'primary' }: Props) {
  return (
    <div 
      className={`header-stack__ticker ${variant === 'announce' ? 'header-stack__ticker--alt' : ''}`}
      role="status" 
      aria-live="polite" 
      data-role={variant === 'announce' ? 'announce-ticker' : 'ticker'}
    >
      <div className="ticker__marquee" data-speed={variant === 'announce' ? 'slow' : 'fast'}>
        <div className="ticker__track">
          <span className="ticker__chunk">
            {variant === 'announce' ? '📣 ' : '🏆 '}{text}
          </span>
          <span className="ticker__chunk" aria-hidden="true">
            {' • • '}{variant === 'announce' ? '📣 ' : '🏆 '}{text}
          </span>
        </div>
      </div>
    </div>
  );
}
