import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-left">
        <button
          id="menu-toggle-btn"
          className="navbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <span className="hamburger-icon">
            <span /><span /><span />
          </span>
        </button>

        <Link to="/" className="navbar-logo" id="logo-link">
          <span className="logo-icon">▶</span>
          <span className="logo-text">VideoTube</span>
        </Link>
      </div>

      <form className="navbar-search" onSubmit={handleSearch} role="search">
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="search-input"
            type="search"
            className="search-input"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search videos"
          />
        </div>
        <button id="search-btn" type="submit" className="btn btn-ghost btn-sm search-btn" aria-label="Submit search">
          Search
        </button>
      </form>

      <div className="navbar-right">
        {user ? (
          <>
            <Link to="/upload" id="upload-nav-btn" className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload
            </Link>

            <div className="navbar-user" ref={dropdownRef}>
              <button
                id="user-menu-btn"
                className="user-avatar-btn"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="avatar avatar-sm"
                />
              </button>

              {dropdownOpen && (
                <div className="user-dropdown" role="menu" aria-label="User menu">
                  <div className="dropdown-header">
                    <img src={user.avatar} alt={user.username} className="avatar avatar-md" />
                    <div>
                      <p className="dropdown-name">{user.fullName}</p>
                      <p className="dropdown-username text-muted">@{user.username}</p>
                    </div>
                  </div>
                  <hr className="divider" />
                  <Link to={`/channel/${user.username}`} className="dropdown-item" role="menuitem" onClick={() => setDropdownOpen(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    My Channel
                  </Link>
                  <Link to="/dashboard" className="dropdown-item" role="menuitem" onClick={() => setDropdownOpen(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Dashboard
                  </Link>
                  <Link to="/history" className="dropdown-item" role="menuitem" onClick={() => setDropdownOpen(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Watch History
                  </Link>
                  <Link to="/liked" className="dropdown-item" role="menuitem" onClick={() => setDropdownOpen(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    Liked Videos
                  </Link>
                  <hr className="divider" />
                  <button id="logout-btn" className="dropdown-item dropdown-item-danger" role="menuitem" onClick={handleLogout}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" id="login-nav-btn" className="btn btn-ghost btn-sm">Log in</Link>
            <Link to="/register" id="register-nav-btn" className="btn btn-primary btn-sm">Sign up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
