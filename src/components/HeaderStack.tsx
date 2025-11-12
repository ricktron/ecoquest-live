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
  tickerText: _tickerText,
  announceText: _announceText,
  showTopTabs = false,
  children,
}: Props) {
  return (
    <div className="header-stack">
      <header className="header-stack__bar" role="banner">
        <div className="header-stack__brand">
          <span className="brand__logo" aria-hidden="true">🌿</span>
          <span className="brand__text">EcoQuest Live</span>
        </div>
        {showTopTabs && tabs && <nav className="header-stack__tabs">{tabs}</nav>}
      </header>
      <main className="header-stack__content">{children}</main>
    </div>
  );
}
