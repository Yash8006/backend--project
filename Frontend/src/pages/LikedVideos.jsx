import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ytInteractAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GoogleConnectBanner from '../components/common/GoogleConnectBanner';
import './YouTubePages.css';

function formatCount(n) {
  if (!n) return '0';
  const num = parseInt(n, 10);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
  return `${num}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function YTLikedCard({ video, onUnlike }) {
  return (
    <div className="yt-liked-card-wrapper">
      <Link
        to={`/yt-watch/${video.videoId}`}
        state={{ snippet: {
          title:        video.title,
          channelTitle: video.channelTitle,
          channelId:    video.channelId,
          publishedAt:  video.publishedAt,
          thumbnails:   { medium: { url: video.thumbnail } },
        }, statistics: { viewCount: video.viewCount, likeCount: video.likeCount } }}
        className="yt-liked-card card"
        id={`yt-liked-${video.videoId}`}
      >
        <div className="yt-liked-thumb-wrap">
          {video.thumbnail
            ? <img src={video.thumbnail} alt={video.title} className="yt-liked-thumb" loading="lazy" />
            : <div className="yt-liked-thumb-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff0000" opacity="0.5">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                </svg>
              </div>
          }
          <span className="yt-liked-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
            </svg>
            YT
          </span>
        </div>

        <div className="yt-liked-info">
          <p className="yt-liked-title">{video.title || 'Untitled'}</p>
          <p className="yt-liked-channel text-muted">{video.channelTitle}</p>
          <div className="yt-liked-stats text-muted">
            {video.viewCount && <span>{formatCount(video.viewCount)} views</span>}
            {video.likeCount && <span>· 👍 {formatCount(video.likeCount)}</span>}
            {video.likedAt   && <span>· Liked {timeAgo(video.likedAt)}</span>}
          </div>
        </div>
      </Link>
      <button
        className="yt-liked-remove-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnlike(video.videoId);
        }}
        title="Unlike on YouTube"
      >
        ×
      </button>
    </div>
  );
}

export default function LikedVideos() {
  const toast  = useToast();
  const { user } = useAuth();

  const [ytConnected,    setYtConnected]    = useState(false);
  const [ytStatusLoaded, setYtStatusLoaded] = useState(false);
  const [ytVideos,       setYtVideos]       = useState([]);
  const [ytLoading,      setYtLoading]      = useState(false);
  const [ytNextPage,     setYtNextPage]     = useState(null);
  const [ytTotal,        setYtTotal]        = useState(0);
  const [loadingMore,    setLoadingMore]    = useState(false);

  // Check YouTube connection status
  useEffect(() => {
    if (!user) { setYtStatusLoaded(true); return; }
    ytInteractAPI.getStatus()
      .then(res => setYtConnected(res?.data?.connected === true))
      .catch(() => setYtConnected(false))
      .finally(() => setYtStatusLoaded(true));
  }, [user]);

  // Load YouTube liked videos
  const loadYtLikedVideos = useCallback(async (pageToken = '', replace = true) => {
    if (!ytConnected) return;
    replace ? setYtLoading(true) : setLoadingMore(true);
    try {
      const res = await ytInteractAPI.getLikedVideos(pageToken);
      const newVideos = res?.data?.videos || [];
      setYtVideos(prev => replace ? newVideos : [...prev, ...newVideos]);
      setYtNextPage(res?.data?.nextPageToken || null);
      setYtTotal(res?.data?.totalResults || 0);
    } catch (err) {
      toast.error(err.message || 'Failed to load YouTube liked videos');
    } finally {
      setYtLoading(false);
      setLoadingMore(false);
    }
  }, [ytConnected, toast]);

  useEffect(() => {
    if (ytConnected) {
      loadYtLikedVideos('', true);
    }
  }, [ytConnected, loadYtLikedVideos]);

  const handleUnlikeVideo = async (videoId) => {
    try {
      await ytInteractAPI.rate(videoId, 'none');
      setYtVideos(prev => prev.filter(v => v.videoId !== videoId));
      setYtTotal(prev => Math.max(0, prev - 1));
      toast.success('Removed from Liked Videos on YouTube');
    } catch (err) {
      toast.error(err.message || 'Failed to unlike video');
    }
  };

  return (
    <main id="liked-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>👍</div>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Liked Videos</h1>
          {!ytLoading && ytConnected && (
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
              {ytTotal > 0 ? `${ytTotal.toLocaleString()} videos liked on YouTube` : 'No liked videos'}
            </p>
          )}
        </div>
      </div>

      {!ytStatusLoaded ? (
        <div className="video-grid">
          {Array.from({ length: 6 }).map((_, i) => <YTLikedSkeleton key={i} />)}
        </div>
      ) : !ytConnected ? (
        <div style={{ maxWidth: 480, margin: '40px auto 0' }}>
          <GoogleConnectBanner />
          <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 12 }}>
            Connect your Google account to see all videos you've liked on YouTube.
          </p>
        </div>
      ) : ytLoading ? (
        <div className="video-grid">
          {Array.from({ length: 8 }).map((_, i) => <YTLikedSkeleton key={i} />)}
        </div>
      ) : ytVideos.length > 0 ? (
        <>
          <div className="video-grid">
            {ytVideos.map(v => <YTLikedCard key={v.videoId} video={v} onUnlike={handleUnlikeVideo} />)}
          </div>
          {ytNextPage && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                id="yt-liked-load-more"
                className="btn btn-ghost"
                onClick={() => loadYtLikedVideos(ytNextPage, false)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="home-empty" style={{ marginTop: 60 }}>
          <div className="empty-icon" style={{ fontSize: 64, marginBottom: 16 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>No liked YouTube videos</h2>
          <p className="text-muted" style={{ marginBottom: 24, maxWidth: 340, textAlign: 'center' }}>
            Videos you like on YouTube will appear here.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Explore Videos
          </Link>
        </div>
      )}
    </main>
  );
}

function YTLikedSkeleton() {
  return (
    <div className="yt-liked-card card" style={{ pointerEvents: 'none' }}>
      <div className="skeleton yt-liked-thumb-wrap" />
      <div className="yt-liked-info" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 4 }} />
      </div>
    </div>
  );
}
