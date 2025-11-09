import React, { useEffect, useState } from "react";
import Ticker from "./Ticker";
import { supabase } from "@/lib/supabaseClient";

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
  const [primarySpeed, setPrimarySpeed] = useState(16000);
  const [announceSpeed, setAnnounceSpeed] = useState(26000);

  useEffect(() => {
    // Fetch ticker speeds from config_filters
    supabase()
      .from('config_filters' as any)
      .select('flags')
      .eq('id', true)
      .single()
      .then(({ data }: any) => {
        if (data?.flags) {
          const flags = data.flags as any;
          setPrimarySpeed(flags.ticker_speed_primary_ms ?? 16000);
          setAnnounceSpeed(flags.ticker_speed_announce_ms ?? 26000);
        }
      });
  }, []);

  return (
    <div className="header-stack">
      <header className="header-stack__bar" role="banner">
        <div className="header-stack__brand">
          <span className="brand__logo" aria-hidden="true">🌿</span>
          <span className="brand__text">EcoQuest Live</span>
        </div>
        {showTopTabs && tabs && <nav className="header-stack__tabs">{tabs}</nav>}
        {tickerText && <Ticker text={tickerText} variant="primary" speedMs={primarySpeed} />}
        {announceText && announceText.trim() !== '' && (
          <Ticker text={announceText} variant="announce" speedMs={announceSpeed} />
        )}
      </header>
      <main className="header-stack__content">{children}</main>
    </div>
  );
}
