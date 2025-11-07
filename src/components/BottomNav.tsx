import { NavLink } from "react-router-dom";

export default function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Primary">
      <NavLink to="/leaderboard" className="bottom-nav__item">
        <span aria-hidden>📊</span>
        <span>Leaderboard</span>
      </NavLink>
      <NavLink to="/trophies" className="bottom-nav__item">
        <span aria-hidden>🏆</span>
        <span>Trophies</span>
      </NavLink>
      <NavLink to="/daily" className="bottom-nav__item">
        <span aria-hidden>📅</span>
        <span>Daily</span>
      </NavLink>
      <NavLink to="/map" className="bottom-nav__item">
        <span aria-hidden>🗺️</span>
        <span>Map</span>
      </NavLink>
    </nav>
  );
}
