import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Leaderboard from "@/pages/Leaderboard";
import Trophies from "@/pages/Trophies";
import Daily from "@/pages/Daily";
import Map from "@/pages/Map";
import Debug from "@/pages/Debug";
import TabNav from "@/components/TabNav";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell bg-background">
        {/* Header */}
        <header className="app-header p-4 bg-background border-b">
          <h1 className="text-xl font-bold">EcoQuest Live</h1>
          <div className="text-xs text-muted-foreground">Costa Rica BioBlitz</div>
        </header>
        
        {/* Desktop top nav */}
        <TabNav />

        {/* Main content */}
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/leaderboard" replace />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/trophies" element={<Trophies />} />
            <Route path="/trophies/:slug" element={<Trophies />} />
            <Route path="/daily" element={<Daily />} />
            <Route path="/map" element={<Map />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="*" element={<Navigate to="/leaderboard" replace />} />
          </Routes>
        </main>
        
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
