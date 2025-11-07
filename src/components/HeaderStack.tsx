import React from "react";

type Props = {
  tabs?: React.ReactNode;
  tickerText?: string;
  announceText?: string;
  showTopTabs?: boolean;
  children: React.ReactNode;
};

export default function HeaderStack({
  tabs,
  tickerText,
  announceText,
  showTopTabs = false,
  children,
}: Props) {
  return (
    <div className="header-stack">
      <header className="header-stack__bar" role="banner">
        <div className="header-stack__brand">
          <span className="brand__logo" aria-hidden>🌿</span>
          <span className="brand__text">EcoQuest Live</span>
        </div>
        {showTopTabs && tabs && <nav className="header-stack__tabs">{tabs}</nav>}
        {tickerText && (
          <div className="header-stack__ticker" role="status" aria-live="polite">
            <div className="ticker__marquee" data-speed="fast">
              <div className="ticker__track">
                <span className="ticker__chunk">🏆 {tickerText}</span>
                <span className="ticker__chunk" aria-hidden="true"> • • 🏆 {tickerText}</span>
              </div>
            </div>
          </div>
        )}
        {announceText && (
          <div className="header-stack__ticker header-stack__ticker--alt" role="status" aria-live="polite">
            <div className="ticker__marquee" data-speed="slow">
              <div className="ticker__track">
                <span className="ticker__chunk">📣 {announceText}</span>
                <span className="ticker__chunk" aria-hidden="true"> • • 📣 {announceText}</span>
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="header-stack__content">{children}</main>
    </div>
  );
}
