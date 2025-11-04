import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Bronze from "@/bronze/Bronze";
import Debug from "@/pages/Debug";
import { Toaster } from "@/components/ui/toaster";
import { FLAGS } from "@/lib/flags";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-neutral-50 flex flex-col">
        <header className="p-3 bg-white shadow-sm border-b">
          <h1 className="text-xl font-bold">EcoQuest Live</h1>
          <div className="text-xs text-neutral-500">Costa Rica BioBlitz</div>
        </header>
        
        <nav className="bg-white border-b">
          <div className="flex">
            <NavLink
              to="/bronze"
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`
              }
            >
              Bronze
            </NavLink>
            <NavLink
              to="/debug"
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900"
                }`
              }
            >
              Debug
            </NavLink>
          </div>
        </nav>

        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/bronze" replace />} />
            <Route path="/bronze" element={<Bronze />} />
            <Route path="/debug" element={<Debug />} />
          </Routes>
        </main>
        
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
