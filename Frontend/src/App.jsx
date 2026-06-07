import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages (lazy imports for code-splitting)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VideoWatch from './pages/VideoWatch';
import Channel from './pages/Channel';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import WatchHistory from './pages/WatchHistory';
import LikedVideos from './pages/LikedVideos';
import YouTubeWatch from './pages/YouTubeWatch';

// Auth pages don't use the sidebar layout
const AUTH_ROUTES = ['/login', '/register'];

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
        <Route path="/register" element={<Register />} />
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
            <Route path="/watch/:videoId" element={<ProtectedRoute><VideoWatch /></ProtectedRoute>} />
            <Route path="/yt-watch/:youtubeId" element={<ProtectedRoute><YouTubeWatch /></ProtectedRoute>} />
            <Route path="/channel/:username" element={<ProtectedRoute><Channel /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><WatchHistory /></ProtectedRoute>} />
            <Route path="/liked" element={<ProtectedRoute><LikedVideos /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
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
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </AuthProvider>
  );
}
