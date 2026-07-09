import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';
import InstallPWA from './components/common/InstallPWA';

// Pages (lazy imports for code-splitting)
import Home from './pages/Home';
import Login from './pages/Login';
import WatchHistory from './pages/WatchHistory';
import LikedVideos from './pages/LikedVideos';
import YouTubeWatch from './pages/YouTubeWatch';
import AuthCallback from './pages/AuthCallback';
import YouTubeSubscriptions from './pages/YouTubeSubscriptions';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import Settings from './pages/Settings';

// Auth pages don't use the sidebar layout
const AUTH_ROUTES = ['/login', '/register', '/auth/callback'];

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />

      <div className="main-with-sidebar">
        <Sidebar open={sidebarOpen} />

        {/* Mobile overlay to close sidebar */}
        {sidebarOpen && (
          <div
            className="overlay"
            style={{ zIndex: 120 }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="page-content">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/yt-watch/:youtubeId" element={<ProtectedRoute><YouTubeWatch /></ProtectedRoute>} />
            <Route path="/yt-subscriptions" element={<ProtectedRoute><YouTubeSubscriptions /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><WatchHistory /></ProtectedRoute>} />
            <Route path="/liked" element={<ProtectedRoute><LikedVideos /></ProtectedRoute>} />
            <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
            <Route path="/playlists/:playlistId" element={<ProtectedRoute><PlaylistDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* Fallback */}
            <Route path="*" element={
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <h1 style={{ fontSize: 72, fontWeight: 900, opacity: 0.3 }}>404</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Page not found</p>
              </div>
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <AppLayout />
          <InstallPWA />
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
