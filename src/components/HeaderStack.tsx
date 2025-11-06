import React from "react";

type Props = { 
  tabs: React.ReactNode; 
  tickerText?: string; 
  children: React.ReactNode; 
};

export default function HeaderStack({ tabs, tickerText, children }: Props) {
  return (
    <div className="header-stack">
      <header className="header-stack__bar" role="banner">
        <nav className="header-stack__tabs">{tabs}</nav>
        {tickerText ? (
          <div className="header-stack__ticker" role="status" aria-live="polite">
            <div className="ticker__marquee">
              <div className="ticker__track">
                <span className="ticker__chunk">🏆 {tickerText}</span>
                <span className="ticker__chunk" aria-hidden="true"> • • 🏆 {tickerText}</span>
              </div>
            </div>
          </div>
        ) : null}
      </header>
      <main className="header-stack__content">{children}</main>
    </div>
  );
}
