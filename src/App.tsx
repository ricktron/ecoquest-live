import { useState } from "react";
import Leaderboard from "@/pages/Leaderboard";
import Today from "@/pages/Today";
import Trophies from "@/pages/Trophies";
import Admin from "@/pages/Admin";
import Ticker from "@/components/Ticker";
import { Toaster } from "@/components/ui/toaster";
import { TrophyResults, RosterRow } from "@/types/trophies";

const TABS = ["Leaderboard","Today","Trophies","Admin"] as const;
type Tab = typeof TABS[number];

export type INatParams = {
  user_id: string;
  d1: string;
  d2: string;
  project_id: string;
};

export default function App() {
  const [tab, setTab] = useState<Tab>("Leaderboard");
  const [trophies, setTrophies] = useState<TrophyResults | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [inatResults, setInatResults] = useState<any[]>([]);
  const [inatParams, setInatParams] = useState<INatParams | null>(null);
  
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
        {tab==="Trophies" && <Trophies trophies={trophies} roster={roster} inatResults={inatResults} inatParams={inatParams} />}
        {tab==="Admin" && <Admin setTrophies={setTrophies} setRoster={setRoster} setInatResults={setInatResults} setInatParams={setInatParams} />}
      </main>
      <nav className="sticky bottom-0 bg-white border-t">
        <div className="grid grid-cols-4">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`py-3 text-xs ${tab===t?"font-semibold text-blue-600":"text-neutral-500"}`}>{t}</button>
          ))}
        </div>
      </nav>
      <Toaster />
    </div>
  );
}
