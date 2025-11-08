import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Post-build ENV reminder
console.info(
  '%c📝 ENV Setup Reminder',
  'background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  '\nMake sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Lovable → Project → Settings → Environment Variables\n' +
  'Other optional vars: VITE_TRIP_PROFILE, VITE_TZ, VITE_TICKER_SPEED_MS, etc.\n'
);

createRoot(document.getElementById("root")!).render(<App />);
