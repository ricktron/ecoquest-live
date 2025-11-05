import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import TabNav from './components/TabNav';
import Leaderboard from './pages/Leaderboard';
import Trophies from './pages/Trophies';
import TrophyDetail from './pages/TrophyDetail';
import Gallery from './pages/Gallery';
import Daily from './pages/Daily';
import DailyDetail from './pages/DailyDetail';
import Map from './pages/Map';
import ObservationDetail from './pages/ObservationDetail';
import UserPage from './pages/UserPage';
import Profile from './pages/Profile';
import ScoringInfo from './pages/ScoringInfo';
import Guide from './pages/Guide';
import Compare from './pages/Compare';
import Debug from './pages/Debug';
import { FLAGS } from './env';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="app-shell">
          <TabNav />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/leaderboard" replace />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              {FLAGS.TROPHIES_ENABLED && <Route path="/trophies" element={<Trophies />} />}
              {FLAGS.TROPHIES_ENABLED && <Route path="/trophies/:slug" element={<TrophyDetail />} />}
              {FLAGS.TROPHIES_ENABLED && <Route path="/gallery" element={<Gallery />} />}
              <Route path="/daily" element={<Daily />} />
              <Route path="/daily/:ymd" element={<DailyDetail />} />
              <Route path="/map" element={<Map />} />
              <Route path="/obs/:id" element={<ObservationDetail />} />
              <Route path="/user/:login" element={<UserPage />} />
              <Route path="/profile/:login" element={<Profile />} />
              <Route path="/about/scoring" element={<ScoringInfo />} />
              <Route path="/guide" element={<Guide />} />
              {FLAGS.ENABLE_COMPARE && <Route path="/compare" element={<Compare />} />}
              <Route path="/debug" element={<Debug />} />
              <Route path="*" element={<Navigate to="/leaderboard" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
