import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import HeaderStack from './components/HeaderStack';
import TabNav from './components/TabNav';
import BottomNav from './components/BottomNav';
import ConfigButton from './components/ConfigButton';
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
import Rarity from './pages/Rarity';
import Debug from './pages/Debug';
import BingoBoard from './features/bingo/BingoBoard';
import Cabinet from './pages/Cabinet';
import { FLAGS, getEnv } from './env';
import { fetchHeaderTexts } from './lib/api';
import TripTicker from './components/TripTickers';

export default function App() {
  const [tickerText, setTicker] = useState<string>();
  const [announceText, setAnnounce] = useState<string | undefined>();
  const tickersEnabled = getEnv('VITE_FEATURE_TICKERS') === '1'; // Feature gate: tickers (CR off, Big Bend on)

  useEffect(() => {
    let on = true;
    (async () => {
      const { ticker, announce } = await fetchHeaderTexts();
      if (!on) return;
      setTicker(ticker);
      setAnnounce(announce);
    })();
    return () => { on = false; };
  }, []);
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <HeaderStack tabs={<TabNav />} tickerText={tickerText} announceText={announceText}>
          <>
            {tickersEnabled && <TripTicker />}
            <Routes>
              <Route path="/" element={<Navigate to="/leaderboard" replace />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/bingo" element={<BingoBoard />} />
            {FLAGS.TROPHIES_ENABLED && <Route path="/trophies" element={<Trophies />} />}
            {FLAGS.TROPHIES_ENABLED && <Route path="/trophies/:slug" element={<TrophyDetail />} />}
            {FLAGS.TROPHIES_ENABLED && <Route path="/cabinet" element={<Cabinet />} />}
            {FLAGS.TROPHIES_ENABLED && <Route path="/gallery" element={<Gallery />} />}
            {FLAGS.TROPHIES_ENABLED && <Route path="/rarity" element={<Rarity />} />}
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
          </>
        </HeaderStack>
        {localStorage.getItem('admin_token') && <ConfigButton />}
        <BottomNav />
        {import.meta.env.DEV && (
          <div 
            data-role="announce-debug" 
            style={{ position: 'fixed', top: 0, right: 0, fontSize: 10, opacity: 0.4, background: '#000', color: '#fff', padding: '2px 4px' }}
          >
            announce: {String(announceText ?? '')}
          </div>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
