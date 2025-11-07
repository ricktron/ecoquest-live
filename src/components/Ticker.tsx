type Props = { 
  text: string; 
  variant?: 'primary' | 'announce'; 
};

export default function Ticker({ text, variant = 'primary' }: Props) {
  return (
    <div 
      className={`ticker ${variant}`} 
      role="status" 
      aria-live="polite"
      data-role={variant === 'announce' ? 'announce-ticker' : 'ticker'}
    >
      <div className="ticker__inner" data-speed={variant === 'announce' ? 'slow' : 'fast'}>
        <div className="ticker__track">
          <span className="ticker__chunk">{text}</span>
          <span className="ticker__chunk" aria-hidden="true">{text}</span>
        </div>
      </div>
    </div>
  );
}
