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
    label: 'Dashboard', to: '/dashboard', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    ), public: false,
  },
  {
    label: 'Upload', to: '/upload', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    ), public: false,
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

        {user && (
          <div className="sidebar-section">
            <p className="sidebar-section-label">Your Channel</p>
            <NavLink
              to={`/channel/${user.username}`}
              className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
              id="sidebar-my-channel"
            >
              <img src={user.avatar} alt={user.username} className="avatar avatar-sm" />
              <span className="sidebar-item-label">{user.fullName}</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-text">© 2025 VideoTube</p>
      </div>
    </aside>
  );
}
