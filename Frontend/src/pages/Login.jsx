import { useSearchParams } from 'react-router-dom';
import './Auth.css';

const BACKEND_URL = import.meta.env.VITE_API_BACKEND || 'http://localhost:8000';

export default function Login() {
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/v1/auth/google`;
  };

  return (
    <div className="landing-container" id="landing-page">
      {/* Background radial glow effects */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />

      {/* Decorative Grid Lines */}
      <div className="grid-overlay" />

      {/* Landing Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="logo-icon-glow">▶</span>
          <span className="logo-text-glow">VideoTube</span>
        </div>
        <div className="landing-nav-actions">
          <span className="nav-status-dot" />
          <span className="nav-status-text">v1.0 Online</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-badge">
            <span className="badge-spark">✨</span>
            <span>The Unified Video Platform</span>
          </div>

          <h1 className="landing-title">
            All Your Videos.<br />
            One <span className="gradient-text">Seamless</span> Experience.
          </h1>

          <p className="landing-subtitle">
            VideoTube connects directly to your Google Account to sync, manage, and engage with YouTube comments, likes, subscriptions, and watch history.
          </p>

          {errorParam && (
            <div className="landing-error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                {errorParam === 'google_auth_failed'
                  ? 'Google authentication failed. Please try again.'
                  : 'An error occurred during authentication.'}
              </span>
            </div>
          )}

          <div className="cta-container">
            <button
              id="google-login-btn"
              type="button"
              className="landing-cta-btn"
              onClick={handleGoogleLogin}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="google-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
              <span className="btn-glow-effect" />
            </button>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="landing-features">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-glow" />
              <div className="feature-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                </svg>
              </div>
              <h3 className="feature-title">YouTube Integrations</h3>
              <p className="feature-desc">
                Subscribe, comment, and like videos directly. Your actions sync in real-time with YouTube using secure tokens.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-glow" />
              <div className="feature-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="feature-title">Watch History</h3>
              <p className="feature-desc">
                A simple chronological watch timeline combining your watched YouTube videos inside the app.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-glow" />
              <div className="feature-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="feature-title">Subscriptions Feed</h3>
              <p className="feature-desc">
                Browse and access your subscribed channels and content updates directly from your unified dashboard.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="footer-text">© {new Date().getFullYear()} VideoTube. Built for next-generation video streaming and integration.</p>
      </footer>
    </div>
  );
}
