import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TabNav from './components/TabNav';
import Leaderboard from './pages/Leaderboard';
import Trophies from './pages/Trophies';
import TrophyDetail from './pages/TrophyDetail';
import Daily from './pages/Daily';
import Map from './pages/Map';
import ObservationDetail from './pages/ObservationDetail';
import UserPage from './pages/UserPage';
import Debug from './pages/Debug';
import { FLAGS } from './env';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <TabNav />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/leaderboard" replace />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            {FLAGS.TROPHIES_ENABLED && <Route path="/trophies" element={<Trophies />} />}
            {FLAGS.TROPHIES_ENABLED && <Route path="/trophies/:slug" element={<TrophyDetail />} />}
            <Route path="/daily" element={<Daily />} />
            <Route path="/map" element={<Map />} />
            <Route path="/obs/:id" element={<ObservationDetail />} />
            <Route path="/user/:login" element={<UserPage />} />
            {FLAGS.ADMIN_ENABLED && <Route path="/debug" element={<Debug />} />}
            <Route path="*" element={<Navigate to="/leaderboard" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
