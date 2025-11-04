import { useState } from "react";
import Leaderboard from "@/pages/Leaderboard";
import Today from "@/pages/Today";
import Trophies from "@/pages/Trophies";
import Debug from "@/pages/Debug";
import Bronze from "@/bronze/Bronze";
import Admin from "@/pages/Admin";
import { Toaster } from "@/components/ui/toaster";
import { TrophyResults, RosterRow } from "@/types/trophies";
import { TROPHIES_ON, ENABLE_ADMIN } from "@/lib/flags";

const TABS = [
  { id: "Bronze", label: "Bronze", show: true },
  { id: "Trophies", label: "Trophies", show: TROPHIES_ON },
  { id: "Leaderboard", label: "Leaderboard", show: ENABLE_ADMIN },
  { id: "Today", label: "Today", show: ENABLE_ADMIN },
  { id: "Admin", label: "Admin", show: ENABLE_ADMIN },
  { id: "Debug", label: "Debug", show: true },
].filter(t => t.show);

type Tab = typeof TABS[number]["id"];

export type INatParams = {
  user_id: string;
  d1: string;
  d2: string;
  project_id: string;
};

export default function App() {
  const [tab, setTab] = useState<Tab>("Bronze");
  const [trophies, setTrophies] = useState<TrophyResults | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [inatResults, setInatResults] = useState<any[]>([]);
  const [inatParams, setInatParams] = useState<INatParams | null>(null);
  
  return (
    <div className="min-h-dvh bg-neutral-50 flex flex-col">
      <header className="p-3 bg-white shadow-sm border-b">
        <h1 className="text-xl font-bold">EcoQuest Live</h1>
        <div className="text-xs text-neutral-500">Costa Rica BioBlitz</div>
      </header>
      
      <nav className="bg-white border-b">
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        {tab === "Bronze" && <Bronze />}
        {tab === "Trophies" && TROPHIES_ON && <Trophies />}
        {tab === "Leaderboard" && ENABLE_ADMIN && <Leaderboard />}
        {tab === "Today" && ENABLE_ADMIN && <Today />}
        {tab === "Admin" && ENABLE_ADMIN && (
          <Admin
            setTrophies={setTrophies}
            setRoster={setRoster}
            setInatResults={setInatResults}
            setInatParams={setInatParams}
          />
        )}
        {tab === "Debug" && <Debug />}
      </main>
      
      <Toaster />
    </div>
  );
}
