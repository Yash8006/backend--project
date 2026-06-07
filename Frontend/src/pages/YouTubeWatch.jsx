import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../api/client';
import useYouTubePlayer from '../hooks/useYouTubePlayer';
import './YouTubeWatch.css';

const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

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

export default function YouTubeWatch() {
  const { youtubeId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  // Seed from router state so info renders instantly (no loading flash)
  const seedSnippet = location.state?.snippet || null;
  const seedStats   = location.state?.statistics || null;

  const [videoMeta, setVideoMeta] = useState(
    seedSnippet
      ? { snippet: seedSnippet, statistics: seedStats || {} }
      : null
  );
  const [metaLoading, setMetaLoading] = useState(!seedSnippet);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [showSavedBadge, setShowSavedBadge] = useState(false); // UI only
  const historySavedRef = useRef(false); // ref = no stale closure

  // ── Fetch full video metadata from YouTube Data API v3 ───────────────────
  useEffect(() => {
    if (!youtubeId || !YT_API_KEY) return;

    const params = new URLSearchParams({
      part: 'snippet,statistics',
      id: youtubeId,
      key: YT_API_KEY,
    });

    fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
      .then(r => r.json())
      .then(data => {
        const item = data.items?.[0];
        if (item) setVideoMeta({ snippet: item.snippet, statistics: item.statistics });
      })
      .catch(() => {}) // seed data is enough if this fails
      .finally(() => setMetaLoading(false));

    // Also fetch related videos
    const relParams = new URLSearchParams({
      part: 'snippet',
      relatedToVideoId: youtubeId,
      type: 'video',
      maxResults: 8,
      key: YT_API_KEY,
    });
    fetch(`https://www.googleapis.com/youtube/v3/search?${relParams}`)
      .then(r => r.json())
      .then(data => setRelatedVideos(data.items || []))
      .catch(() => {});
  }, [youtubeId]);

  // ── Watch history — fire once when 30s threshold is reached ─────────────
  const handleWatchThreshold = useCallback(() => {
    // Use a ref as the guard — avoids stale-closure double-fire
    if (!user || historySavedRef.current) return;
    historySavedRef.current = true;
    setShowSavedBadge(true); // trigger UI badge

    const snippet = videoMeta?.snippet;
    authAPI.addYouTubeToHistory({
      youtubeId,
      title:        snippet?.title        || '',
      thumbnail:    snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '',
      channelTitle: snippet?.channelTitle || '',
    }).catch(() => {}); // silent fail
  }, [user, youtubeId, videoMeta]);

  // ── YouTube IFrame Player via our hook ───────────────────────────────────
  const { containerRef } = useYouTubePlayer({
    videoId: youtubeId,
    watchThresholdSeconds: 30,
    onWatchThreshold: handleWatchThreshold,
    // NOTE: onEnded is intentionally omitted — the hook already calls
    // onWatchThreshold when the video ends before the 30s threshold.
    // Passing handleWatchThreshold to BOTH caused a double-save.
  });

  const snippet    = videoMeta?.snippet;
  const statistics = videoMeta?.statistics;
  const title        = snippet?.title        || 'YouTube Video';
  const channelTitle = snippet?.channelTitle || '';
  const channelId    = snippet?.channelId    || '';
  const description  = snippet?.description  || '';
  const publishedAt  = snippet?.publishedAt;
  const thumbnail    = snippet?.thumbnails?.medium?.url || '';
  const viewCount    = statistics?.viewCount;
  const likeCount    = statistics?.likeCount;
  const youtubeUrl   = `https://www.youtube.com/watch?v=${youtubeId}`;

  return (
    <main id="yt-watch-page" className="yt-watch-page">
      <div className="watch-layout">

        {/* ── Player + Info ──────────────────────────────────────────── */}
        <div className="watch-main">

          {/* IFrame Player mounts here */}
          <div className="yt-player-wrap">
            <div ref={containerRef} id="yt-player" className="yt-player" />
          </div>

          <div className="watch-info">
            <div className="yt-watch-title-row">
              <h1 className="watch-title">
                {metaLoading && !snippet ? (
                  <span className="skeleton" style={{ display: 'block', height: 28, width: '70%', borderRadius: 6 }} />
                ) : title}
              </h1>
              {/* YouTube badge */}
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="open-on-yt-btn"
                className="btn btn-ghost btn-sm yt-open-badge"
                title="Open on YouTube"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                </svg>
                Open on YouTube
              </a>
            </div>

            {/* Stats bar */}
            <div className="watch-meta-bar">
              <div className="watch-stats">
                {viewCount && <span className="text-muted">{formatViews(viewCount)}</span>}
                {viewCount && publishedAt && <span className="text-muted">·</span>}
                {publishedAt && <span className="text-muted">{timeAgo(publishedAt)}</span>}
                {likeCount && (
                  <>
                    <span className="text-muted">·</span>
                    <span className="text-muted">
                      {formatViews(likeCount).replace(' views', '')} likes
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Channel info */}
            {channelTitle && (
              <div className="watch-channel-bar">
                <a
                  href={`https://www.youtube.com/channel/${channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="watch-channel-info"
                >
                  <div className="yt-channel-avatar-lg">
                    {channelTitle.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="watch-channel-name">{channelTitle}</p>
                    <p className="text-muted" style={{ fontSize: 12 }}>YouTube Channel</p>
                  </div>
                </a>
              </div>
            )}

            {/* History save indicator */}
            {showSavedBadge && (
              <div className="yt-history-saved-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Saved to watch history
              </div>
            )}

            {/* Description */}
            {description && (
              <details className="watch-description card yt-description-details">
                <summary className="yt-description-summary">Show description</summary>
                <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{description}</p>
              </details>
            )}
          </div>
        </div>

        {/* ── Related videos sidebar ─────────────────────────────────── */}
        <aside className="watch-sidebar" aria-label="Related videos">
          <h2 className="watch-sidebar-title">Related Videos</h2>
          <div className="watch-related-list">
            {relatedVideos.length === 0 && (
              <p className="text-muted" style={{ fontSize: 13 }}>No related videos</p>
            )}
            {relatedVideos.map((v) => {
              const vid = typeof v.id === 'string' ? v.id : v.id?.videoId;
              if (!vid) return null;
              const relThumb = v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '';
              const relTitle = v.snippet?.title || 'Untitled';
              const relChannel = v.snippet?.channelTitle || '';
              return (
                <Link
                  key={vid}
                  to={`/yt-watch/${vid}`}
                  state={{ snippet: v.snippet, statistics: {} }}
                  className="yt-related-card"
                  id={`related-yt-${vid}`}
                >
                  <div className="yt-related-thumb-wrap">
                    <img src={relThumb} alt={relTitle} className="yt-related-thumb" loading="lazy" />
                    <span className="yt-badge-sm">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                      </svg>
                    </span>
                  </div>
                  <div className="yt-related-info">
                    <p className="yt-related-title">{relTitle}</p>
                    <p className="text-muted" style={{ fontSize: 12 }}>{relChannel}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
