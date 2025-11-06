import React from "react";

type Props = { 
  tabs: React.ReactNode; 
  tickerText?: string; 
  children: React.ReactNode; 
};

export default function HeaderStack({ tabs, tickerText, children }: Props) {
  return (
    <div className="header-stack">
      <header className="header-stack__bar">
        <nav className="header-stack__tabs">{tabs}</nav>
        {tickerText ? (
          <div className="header-stack__ticker" role="status" aria-live="polite">
            <span className="ticker__icon">🏆</span>
            <span className="ticker__text">{tickerText}</span>
          </div>
        ) : null}
      </header>
      <main className="header-stack__content">{children}</main>
    </div>
  );
}
