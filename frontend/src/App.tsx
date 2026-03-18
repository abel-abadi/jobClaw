import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import JobDetail from './pages/JobDetail';
import Profile from './pages/Profile';
import Tracker from './pages/Tracker';
import Settings from './pages/Settings';

const navItems = [
  { to: '/', icon: '⚡', label: "Today's Picks" },
  { to: '/tracker', icon: '📋', label: 'Tracker' },
  { to: '/profile', icon: '👤', label: 'Profile' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function App() {
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🦞</span>
          <span className="sidebar-logo-text">jobClaw</span>
        </div>
        <div className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            jobClaw v0.1.0
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
