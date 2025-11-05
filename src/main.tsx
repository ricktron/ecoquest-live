import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Post-build ENV reminder
console.info(
  '%c📝 ENV Setup Reminder',
  'background: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
  '\nMake sure these environment variables are set in Lovable → Project → Settings → Environment Variables:\n' +
  '- VITE_TRIP_PROFILE\n- VITE_TZ\n- VITE_TICKER_SPEED_MS\n- VITE_RARITY_GROUP_WEIGHT\n' +
  '- VITE_RARITY_LOCAL_WEIGHT\n- VITE_BASELINE_YEARS\n- VITE_BASELINE_MONTHS\n' +
  '- VITE_ENABLE_COMPARE\n- VITE_ENABLE_EMAIL_DIGEST (optional)\n'
);

createRoot(document.getElementById("root")!).render(<App />);
