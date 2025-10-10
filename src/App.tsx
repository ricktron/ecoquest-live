import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Leaderboard from './pages/Leaderboard';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Tab({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        active 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </button>
  );
}

function AppContent() {
  const [tab, setTab] = useState<'leaderboard'|'today'|'trophies'|'trends'>('leaderboard');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">EcoQuest Live</h1>
        <div className="flex gap-2 flex-wrap">
          <Tab active={tab==='leaderboard'} onClick={()=>setTab('leaderboard')}>Leaderboard</Tab>
          <Tab active={tab==='today'} onClick={()=>setTab('today')}>Today</Tab>
          <Tab active={tab==='trophies'} onClick={()=>setTab('trophies')}>Trophies</Tab>
          <Tab active={tab==='trends'} onClick={()=>setTab('trends')}>Trends</Tab>
        </div>

        {tab==='leaderboard' && <Leaderboard />}
        {tab==='today' && <div className="text-muted-foreground p-8 text-center">Today view coming next.</div>}
        {tab==='trophies' && <div className="text-muted-foreground p-8 text-center">Trophies view coming next.</div>}
        {tab==='trends' && <div className="text-muted-foreground p-8 text-center">Trends view coming next.</div>}
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/landing" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
