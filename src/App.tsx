import { useState } from "react";
import Leaderboard from "@/pages/Leaderboard";
import Today from "@/pages/Today";
import Trophies from "@/pages/Trophies";
import Ticker from "@/components/Ticker";

const TABS = ["Leaderboard","Today","Trophies"] as const;
type Tab = typeof TABS[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Leaderboard");
  return (
    <div className="min-h-dvh bg-neutral-50 flex flex-col">
      <Ticker />
      <header className="p-3 bg-white shadow-sm">
        <h1 className="text-xl font-bold">EcoQuest Live</h1>
        <div className="text-xs text-neutral-500">Costa Rica BioBlitz</div>
      </header>
      <main className="flex-1">
        {tab==="Leaderboard" && <Leaderboard/>}
        {tab==="Today" && <Today/>}
        {tab==="Trophies" && <Trophies/>}
      </main>
      <nav className="sticky bottom-0 bg-white border-t">
        <div className="grid grid-cols-3">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`py-3 ${tab===t?"font-semibold text-blue-600":"text-neutral-500"}`}>{t}</button>
          ))}
        </div>
      </nav>
    </div>
  );
}
