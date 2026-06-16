import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/client';
import { useToast } from '../context/ToastContext';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function YouTubeHistoryCard({ item, onRemove }) {
  return (
    <div className="yt-history-card-wrapper">
      <Link
        to={`/yt-watch/${item.youtubeId}`}
        className="card"
        id={`yt-hist-${item.youtubeId}`}
        style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', overflow: 'hidden', borderRadius: 'var(--radius-md)', transition: 'transform 0.18s, box-shadow 0.18s' }}
      >
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--surface-2, #1a1a1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#ff0000" opacity="0.5">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
              </svg>
            </div>
          )}
          <span style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.8)', color: '#ff0000',
            borderRadius: 3, padding: '2px 5px', fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
            </svg>
            YT
          </span>
        </div>

        <div style={{ padding: '10px 12px 12px' }}>
          <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4, margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.title || 'Untitled'}
          </p>
          <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>{item.channelTitle}</p>
          {item.watchedAt && (
            <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Watched {timeAgo(item.watchedAt)}</p>
          )}
        </div>
      </Link>
      <button
        className="yt-history-remove-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.youtubeId);
        }}
        title="Remove from history (App only)"
      >
        ×
      </button>
    </div>
  );
}

export default function WatchHistory() {
  const toast = useToast();
  const [ytVideos, setYtVideos] = useState([]);
  const [ytLoading, setYtLoading] = useState(true);
  const [clearingYt, setClearingYt] = useState(false);

  useEffect(() => {
    authAPI.getYouTubeWatchHistory()
      .then(res => setYtVideos(res?.data || []))
      .catch(() => {})
      .finally(() => setYtLoading(false));
  }, []);

  const handleRemoveHistoryItem = async (youtubeId) => {
    try {
      await authAPI.removeFromYouTubeHistory(youtubeId);
      setYtVideos(prev => prev.filter(v => v.youtubeId !== youtubeId));
      toast.success('Removed from history (App only)');
    } catch (err) {
      toast.error(err.message || 'Failed to remove video from history');
    }
  };

  const handleClearYouTubeHistory = async () => {
    if (!window.confirm('Clear your entire YouTube watch history?')) return;
    setClearingYt(true);
    try {
      await authAPI.clearYouTubeHistory();
      setYtVideos([]);
      toast.success('YouTube history cleared');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClearingYt(false);
    }
  };

  return (
    <main id="history-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>📜</div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Watch History</h1>
            {!ytLoading && (
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
                {ytVideos.length} {ytVideos.length === 1 ? 'video' : 'videos'} watched · <span style={{ opacity: 0.8, cursor: 'help', textDecoration: 'underline dotted' }} title="YouTube does not provide an API to modify your history. Deletions here are saved locally inside this app.">Deletions are App-only ℹ️</span>
              </p>
            )}
          </div>
        </div>

        {!ytLoading && ytVideos.length > 0 && (
          <button
            id="clear-yt-history-btn"
            className="btn btn-ghost btn-sm"
            onClick={handleClearYouTubeHistory}
            disabled={clearingYt}
            style={{ gap: 6, display: 'flex', alignItems: 'center', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
            {clearingYt ? 'Clearing…' : 'Clear History'}
          </button>
        )}
      </div>

      {ytLoading ? (
        <div className="video-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card" style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
              <div className="skeleton" style={{ aspectRatio: '16/9' }} />
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : ytVideos.length > 0 ? (
        <div className="video-grid">
          {ytVideos.map(item => <YouTubeHistoryCard key={item.youtubeId + item.watchedAt} item={item} onRemove={handleRemoveHistoryItem} />)}
        </div>
      ) : (
        <div className="home-empty" style={{ marginTop: 80 }}>
          <div className="empty-icon" style={{ fontSize: 64, marginBottom: 16 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="#ff0000" opacity="0.6"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>No watch history yet</h2>
          <p className="text-muted" style={{ marginBottom: 24, maxWidth: 360, textAlign: 'center' }}>
            YouTube videos you watch inside this app will appear here.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Browse Trending
          </Link>
        </div>
      )}
    </main>
  );
}
