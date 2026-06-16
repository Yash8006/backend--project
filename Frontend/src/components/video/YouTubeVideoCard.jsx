import { useState } from 'react';
import { Link } from 'react-router-dom';
import AddToPlaylistModal from '../playlist/AddToPlaylistModal';
import './YouTubeVideoCard.css';

function formatViews(count) {
  if (!count) return '';
  const n = parseInt(count, 10);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

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

export default function YouTubeVideoCard({ video }) {
  const [showModal, setShowModal] = useState(false);
  const { id, snippet, statistics, isProgress, progress, duration } = video;
  const videoId = typeof id === 'string' ? id : id?.videoId;
  const title = snippet?.title || 'Untitled';
  const channelTitle = snippet?.channelTitle || '';
  const thumbnail =
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.default?.url ||
    '';
  const publishedAt = snippet?.publishedAt;
  const viewCount = statistics?.viewCount;

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const channelUrl = `https://www.youtube.com/channel/${snippet?.channelId}`;

  return (
    <>
      <article className="yt-video-card card">
        <Link
          to={`/yt-watch/${videoId}`}
          state={{ snippet, statistics }}
          id={`yt-video-${videoId}`}
          className="yt-video-thumb-link"
        >
          <div className="yt-video-thumb-wrap">
            <img
              src={thumbnail}
              alt={title}
              className="yt-video-thumb"
              loading="lazy"
            />
            <div className="yt-video-play-overlay">
              <span className="yt-play-icon-circle">▶</span>
            </div>
            <button
              className="ph-video-card-save-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowModal(true);
              }}
              title="Save to playlist"
            >
              <span>⊕</span> Save
            </button>
            {/* YouTube badge */}
            <span className="yt-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
              </svg>
              YouTube
            </span>
            {isProgress && duration && (
              <div className="yt-video-progress-bar-wrap">
                <div 
                  className="yt-video-progress-bar-fill" 
                  style={{ width: `${Math.min(100, Math.max(0, (progress / duration) * 100))}%` }} 
                />
              </div>
            )}
          </div>
        </Link>

        <div className="yt-video-info">
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="yt-channel-avatar-link"
            aria-label={channelTitle}
          >
            <div className="yt-channel-avatar">
              {channelTitle.charAt(0).toUpperCase()}
            </div>
          </a>

          <div className="yt-video-meta">
            <Link
              to={`/yt-watch/${videoId}`}
              state={{ snippet, statistics }}
              className="yt-video-title"
              title={title}
            >
              {title}
            </Link>
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="yt-channel-name text-muted"
            >
              {channelTitle}
            </a>
            <p className="yt-video-stats text-muted">
              {isProgress ? (
                <span className="yt-continue-label" style={{ color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block' }}>
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Continue Watching
                </span>
              ) : (
                <>
                  {viewCount ? formatViews(viewCount) : ''}
                  {viewCount && publishedAt ? ' • ' : ''}
                  {publishedAt ? timeAgo(publishedAt) : ''}
                </>
              )}
            </p>
          </div>
        </div>
      </article>
      {showModal && (
        <AddToPlaylistModal
          video={video}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export function YouTubeVideoCardSkeleton() {
  return (
    <div className="yt-video-card card" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-md)' }} />
      <div className="yt-video-info" style={{ padding: '12px 0' }}>
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 14, borderRadius: 4, width: '90%' }} />
          <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '60%' }} />
          <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '40%' }} />
        </div>
      </div>
    </div>
  );
}
