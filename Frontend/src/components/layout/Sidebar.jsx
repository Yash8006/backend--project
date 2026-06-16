import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  {
    label: 'Home', to: '/', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ), public: true,
  },
  {
    label: 'History', to: '/history', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ), public: false,
  },
  {
    label: 'Liked Videos', to: '/liked', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
    ), public: false,
  },
  {
    label: 'Playlists', to: '/playlists', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    ), public: false,
  },
];

const ytNavItems = [
  {
    label: 'YT Subscriptions', to: '/yt-subscriptions', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    ),
  },
];

export default function Sidebar({ open }) {
  const { user } = useAuth();

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Sidebar navigation">
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          {navItems.map((item) => {
            if (!item.public && !user) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                id={`sidebar-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* ── YouTube Section ──────────────────────────────────── */}
        {user && (
          <div className="sidebar-section">
            <p className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff0000"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
              YouTube
            </p>
            {ytNavItems.map(item => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                id={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-text">© 2025 VideoTube</p>
      </div>
    </aside>
  );
}
