import { Link } from 'react-router-dom';
import './VideoCard.css';

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

function timeAgo(dateStr) {
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

export default function VideoCard({ video }) {
  const { _id, title, thumbnail, duration, views, createdAt, owner } = video;

  return (
    <article className="video-card card">
      <Link to={`/watch/${_id}`} id={`video-card-${_id}`} className="video-card-thumb-link">
        <div className="video-card-thumb-wrap">
          <img
            src={thumbnail}
            alt={title}
            className="video-card-thumb"
            loading="lazy"
          />
          <span className="video-card-duration">{formatDuration(duration)}</span>
          <div className="video-card-play-overlay">
            <span className="play-icon-circle">▶</span>
          </div>
        </div>
      </Link>

      <div className="video-card-info">
        {owner && (
          <Link to={`/channel/${owner.username}`} className="video-card-avatar-link">
            <img
              src={owner.avatar}
              alt={owner.username}
              className="avatar avatar-sm"
            />
          </Link>
        )}

        <div className="video-card-meta">
          <Link to={`/watch/${_id}`} className="video-card-title" title={title}>
            {title}
          </Link>
          {owner && (
            <Link to={`/channel/${owner.username}`} className="video-card-channel text-muted">
              {owner.fullName || owner.username}
            </Link>
          )}
          <p className="video-card-stats text-muted">
            {formatViews(views ?? 0)} • {timeAgo(createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="video-card card" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-md)' }} />
      <div className="video-card-info" style={{ padding: '12px 0' }}>
        <div className="skeleton avatar avatar-sm" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 14, borderRadius: 4, width: '90%' }} />
          <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '60%' }} />
          <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '40%' }} />
        </div>
      </div>
    </div>
  );
}
