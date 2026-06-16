import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authAPI, ytInteractAPI } from '../api/client';
import useYouTubePlayer from '../hooks/useYouTubePlayer';
import GoogleConnectBanner from '../components/common/GoogleConnectBanner';
import './YouTubeWatch.css';

const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatViews(count) {
  if (!count) return '';
  const n = parseInt(count, 10);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

function formatCount(count) {
  if (!count) return '0';
  const n = parseInt(count, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function YouTubeWatch() {
  const { youtubeId }  = useParams();
  const location       = useLocation();
  const { user }       = useAuth();
  const toast          = useToast();

  // ── Video metadata ───────────────────────────────────────────────────────
  const seedSnippet = location.state?.snippet    || null;
  const seedStats   = location.state?.statistics || null;

  const [videoMeta,   setVideoMeta]   = useState(
    seedSnippet ? { snippet: seedSnippet, statistics: seedStats || {} } : null
  );
  const [metaLoading,    setMetaLoading]    = useState(!seedSnippet);
  const [relatedVideos,  setRelatedVideos]  = useState([]);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const historySavedRef = useRef(false);
  const [channelMeta, setChannelMeta] = useState(null);

  // ── YouTube interaction state ────────────────────────────────────────────
  const [ytConnected,    setYtConnected]    = useState(false);   // has YouTube token?
  const [ytLoading,      setYtLoading]      = useState(true);    // checking status

  // Like
  const [myRating,       setMyRating]       = useState('none');  // 'like' | 'dislike' | 'none'
  const [ratingLoading,  setRatingLoading]  = useState(false);

  // Subscribe
  const [subscribed,     setSubscribed]     = useState(false);
  const [subLoading,     setSubLoading]     = useState(false);

  // Comments
  const [comments,       setComments]       = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [nextPageToken,  setNextPageToken]  = useState(null);
  const [commentText,    setCommentText]    = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // ── Fetch video metadata ─────────────────────────────────────────────────
  useEffect(() => {
    if (!youtubeId || !YT_API_KEY) return;

    const params = new URLSearchParams({ part: 'snippet,statistics', id: youtubeId, key: YT_API_KEY });
    fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
      .then(r => r.json())
      .then(data => {
        const item = data.items?.[0];
        if (item) setVideoMeta({ snippet: item.snippet, statistics: item.statistics });
      })
      .catch(() => {})
      .finally(() => setMetaLoading(false));

    const relParams = new URLSearchParams({
      part: 'snippet', relatedToVideoId: youtubeId, type: 'video', maxResults: 8, key: YT_API_KEY,
    });
    fetch(`https://www.googleapis.com/youtube/v3/search?${relParams}`)
      .then(r => r.json())
      .then(data => setRelatedVideos(data.items || []))
      .catch(() => {});
  }, [youtubeId]);

  // ── Fetch channel statistics (subscriber count & avatar) ──────────────────
  useEffect(() => {
    setChannelMeta(null);
    const channelId = videoMeta?.snippet?.channelId;
    if (!channelId || !YT_API_KEY) return;

    ytInteractAPI.getChannelStats(channelId, YT_API_KEY)
      .then(res => {
        if (res?.success && res?.data) {
          setChannelMeta(res.data);
        }
      })
      .catch(() => {});
  }, [videoMeta?.snippet?.channelId]);

  // ── Check YouTube connection status ──────────────────────────────────────
  useEffect(() => {
    if (!user) { setYtLoading(false); return; }
    ytInteractAPI.getStatus()
      .then(res => setYtConnected(res?.data?.connected === true))
      .catch(() => setYtConnected(false))
      .finally(() => setYtLoading(false));
  }, [user]);

  // ── Fetch rating + subscription status ───────────────────────────────────
  useEffect(() => {
    if (!ytConnected || !youtubeId) return;

    // Rating
    ytInteractAPI.getRating(youtubeId)
      .then(res => setMyRating(res?.data?.rating || 'none'))
      .catch(() => {});

    // Subscription
    const channelId = videoMeta?.snippet?.channelId;
    if (channelId) {
      ytInteractAPI.checkSubscription(channelId)
        .then(res => setSubscribed(res?.data?.subscribed === true))
        .catch(() => {});
    }
  }, [ytConnected, youtubeId, videoMeta?.snippet?.channelId]);

  // ── Fetch comments ───────────────────────────────────────────────────────
  const loadComments = useCallback(async (pageToken = '', replace = true) => {
    if (!ytConnected || !youtubeId) return;
    setCommentsLoading(true);
    try {
      const res = await ytInteractAPI.getComments(youtubeId, pageToken);
      const newComments = res?.data?.comments || [];
      setComments(prev => replace ? newComments : [...prev, ...newComments]);
      setNextPageToken(res?.data?.nextPageToken || null);
    } catch {
      // Comments might be disabled on this video — fail silently
    } finally {
      setCommentsLoading(false);
    }
  }, [ytConnected, youtubeId]);

  useEffect(() => {
    if (ytConnected) loadComments('', true);
  }, [ytConnected, loadComments]);

  // ── Watch history ─────────────────────────────────────────────────────────
  const handleWatchThreshold = useCallback(() => {
    if (!user || historySavedRef.current) return;
    historySavedRef.current = true;
    setShowSavedBadge(true);

    const snippet = videoMeta?.snippet;
    authAPI.addYouTubeToHistory({
      youtubeId,
      title:        snippet?.title        || '',
      thumbnail:    snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '',
      channelTitle: snippet?.channelTitle || '',
    }).catch(() => {});
  }, [user, youtubeId, videoMeta]);

  // ── YouTube Progress Tracking ─────────────────────────────────────────────
  const startSeconds = (() => {
    try {
      const progressMap = JSON.parse(localStorage.getItem('video_tube_watch_progress') || '{}');
      const saved = progressMap[youtubeId];
      if (saved && saved.progress && saved.duration) {
        return Math.floor(saved.progress);
      }
    } catch (_) {}
    return 0;
  })();

  const handleProgress = useCallback((currentTime, duration) => {
    const isFinished = (duration - currentTime) < 10 || (currentTime / duration) > 0.95;
    const key = 'video_tube_watch_progress';
    try {
      const progressMap = JSON.parse(localStorage.getItem(key) || '{}');
      if (isFinished) {
        delete progressMap[youtubeId];
      } else if (currentTime > 5) {
        const snippet = videoMeta?.snippet;
        progressMap[youtubeId] = {
          youtubeId,
          progress: currentTime,
          duration: duration,
          title: snippet?.title || '',
          thumbnail: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '',
          channelTitle: snippet?.channelTitle || '',
          timestamp: Date.now(),
        };
      }
      localStorage.setItem(key, JSON.stringify(progressMap));
    } catch (_) {}
  }, [youtubeId, videoMeta]);

  const handleEnded = useCallback(() => {
    const key = 'video_tube_watch_progress';
    try {
      const progressMap = JSON.parse(localStorage.getItem(key) || '{}');
      delete progressMap[youtubeId];
      localStorage.setItem(key, JSON.stringify(progressMap));
    } catch (_) {}
  }, [youtubeId]);

  // ── YouTube IFrame Player ─────────────────────────────────────────────────
  const { containerRef } = useYouTubePlayer({
    videoId:              youtubeId,
    watchThresholdSeconds: 30,
    onWatchThreshold:     handleWatchThreshold,
    onProgress:           handleProgress,
    onEnded:              handleEnded,
    startSeconds:         startSeconds,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRate = async (rating) => {
    if (ratingLoading) return;
    const newRating = myRating === rating ? 'none' : rating; // toggle
    setRatingLoading(true);
    const prev = myRating;
    setMyRating(newRating); // optimistic
    try {
      await ytInteractAPI.rate(youtubeId, newRating);
      toast.success(newRating === 'none' ? 'Rating removed' : `Video ${newRating}d on YouTube`);
    } catch (err) {
      setMyRating(prev); // rollback
      toast.error(err.message || 'Failed to rate video');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (subLoading) return;
    const channelId = videoMeta?.snippet?.channelId;
    if (!channelId) return;
    setSubLoading(true);
    const prev = subscribed;
    setSubscribed(!subscribed); // optimistic
    try {
      await ytInteractAPI.toggleSubscription(channelId, !prev);
      toast.success(!prev ? 'Subscribed!' : 'Unsubscribed');
    } catch (err) {
      setSubscribed(prev); // rollback
      toast.error(err.message || 'Subscription action failed');
    } finally {
      setSubLoading(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await ytInteractAPI.postComment(youtubeId, commentText.trim());
      toast.success('Comment posted on YouTube!');
      setCommentText('');
      // Prepend the new comment optimistically
      const newItem = res?.data;
      if (newItem) setComments(prev => [newItem, ...prev]);
      else loadComments('', true); // refetch if API didn't return the new item
    } catch (err) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const snippet      = videoMeta?.snippet;
  const statistics   = videoMeta?.statistics;
  const title        = snippet?.title        || 'YouTube Video';
  const channelTitle = snippet?.channelTitle || '';
  const channelId    = snippet?.channelId    || '';
  const description  = snippet?.description  || '';
  const publishedAt  = snippet?.publishedAt;
  const viewCount    = statistics?.viewCount;
  const likeCount    = statistics?.likeCount;
  const youtubeUrl   = `https://www.youtube.com/watch?v=${youtubeId}`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main id="yt-watch-page" className="yt-watch-page">
      <div className="watch-layout">

        {/* ── Player + Info ────────────────────────────────────────────── */}
        <div className="watch-main">

          {/* IFrame Player */}
          <div className="yt-player-wrap">
            <div ref={containerRef} id="yt-player" className="yt-player" />
          </div>

          <div className="watch-info">
            {/* Title row */}
            <div className="yt-watch-title-row">
              <h1 className="watch-title">
                {metaLoading && !snippet ? (
                  <span className="skeleton" style={{ display: 'block', height: 28, width: '70%', borderRadius: 6 }} />
                ) : title}
              </h1>
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
                    <span className="text-muted">{formatCount(likeCount)} likes</span>
                  </>
                )}
              </div>
            </div>

            {/* Channel + Subscribe row */}
            {channelTitle && (
              <div className="watch-channel-bar">
                <a
                  href={`https://www.youtube.com/channel/${channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="watch-channel-info"
                >
                  <div className="yt-channel-avatar-lg">
                    {channelMeta?.thumbnail ? (
                      <img src={channelMeta.thumbnail} alt={channelTitle} className="avatar-img" />
                    ) : (
                      channelTitle.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="watch-channel-name">{channelTitle}</p>
                    <p className="text-muted" style={{ fontSize: 12 }}>
                      {channelMeta?.subscriberCount ? `${formatCount(channelMeta.subscriberCount)} subscribers` : 'YouTube Channel'}
                    </p>
                  </div>
                </a>

                {/* Subscribe button — only if YouTube connected */}
                {!ytLoading && ytConnected && (
                  <button
                    id="yt-subscribe-btn"
                    className={`yt-subscribe-btn ${subscribed ? 'subscribed' : ''}`}
                    onClick={handleSubscribe}
                    disabled={subLoading}
                    aria-label={subscribed ? 'Unsubscribe' : 'Subscribe'}
                  >
                    {subLoading ? (
                      <span className="yt-btn-spinner" />
                    ) : subscribed ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                        Subscribed
                      </>
                    ) : 'Subscribe'}
                  </button>
                )}
              </div>
            )}

            {/* ── Like / Dislike Actions ──────────────────────────────── */}
            {!ytLoading && ytConnected && (
              <div className="yt-actions-bar">
                {/* Like */}
                <button
                  id="yt-like-btn"
                  className={`yt-action-btn ${myRating === 'like' ? 'active-like' : ''}`}
                  onClick={() => handleRate('like')}
                  disabled={ratingLoading}
                  aria-label="Like video"
                  aria-pressed={myRating === 'like'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={myRating === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  {likeCount ? formatCount(likeCount) : 'Like'}
                </button>

                {/* Dislike */}
                <button
                  id="yt-dislike-btn"
                  className={`yt-action-btn ${myRating === 'dislike' ? 'active-dislike' : ''}`}
                  onClick={() => handleRate('dislike')}
                  disabled={ratingLoading}
                  aria-label="Dislike video"
                  aria-pressed={myRating === 'dislike'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={myRating === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                  </svg>
                  Dislike
                </button>
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

            {/* ── Google Connect Banner ───────────────────────────────── */}
            {!ytLoading && !ytConnected && user && <GoogleConnectBanner />}

            {/* Description */}
            {description && (
              <details className="watch-description card yt-description-details">
                <summary className="yt-description-summary">Show description</summary>
                <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{description}</p>
              </details>
            )}

            {/* ── Comments Section ─────────────────────────────────────── */}
            {!ytLoading && ytConnected && (
              <section className="yt-comments-section" aria-label="Comments">
                <h2 className="yt-comments-heading">Comments</h2>

                {/* Post a comment */}
                <form
                  id="yt-comment-form"
                  className="yt-comment-form"
                  onSubmit={handlePostComment}
                >
                  <div className="yt-comment-avatar">
                    {user?.avatar
                      ? <img src={user.avatar} alt={user.fullName} className="avatar" style={{ width: 36, height: 36 }} />
                      : <div className="yt-channel-avatar-lg" style={{ width: 36, height: 36, fontSize: 14 }}>
                          {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    }
                  </div>
                  <div className="yt-comment-input-wrap">
                    <textarea
                      id="yt-comment-input"
                      className="yt-comment-input"
                      placeholder="Add a comment on YouTube…"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      rows={2}
                      maxLength={2000}
                    />
                    {commentText.trim() && (
                      <div className="yt-comment-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setCommentText('')}
                        >
                          Cancel
                        </button>
                        <button
                          id="yt-post-comment-btn"
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={postingComment}
                        >
                          {postingComment ? 'Posting…' : 'Comment'}
                        </button>
                      </div>
                    )}
                  </div>
                </form>

                {/* Comment list */}
                <div className="yt-comment-list">
                  {commentsLoading && comments.length === 0 && (
                    <div className="yt-comments-loading">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="yt-comment-skeleton">
                          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div className="skeleton" style={{ height: 12, width: '30%', marginBottom: 6, borderRadius: 4 }} />
                            <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!commentsLoading && comments.length === 0 && (
                    <p className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>
                      No comments yet or comments are disabled for this video.
                    </p>
                  )}

                  {comments.map((item, idx) => {
                    const c = item?.snippet?.topLevelComment?.snippet || item?.snippet;
                    if (!c) return null;
                    return (
                      <div key={item.id || idx} className="yt-comment-item">
                        <div className="yt-comment-avatar">
                          {c.authorProfileImageUrl
                            ? <img src={c.authorProfileImageUrl} alt={c.authorDisplayName} className="avatar" style={{ width: 36, height: 36 }} />
                            : <div className="yt-channel-avatar-lg" style={{ width: 36, height: 36, fontSize: 13 }}>
                                {c.authorDisplayName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                          }
                        </div>
                        <div className="yt-comment-body">
                          <div className="yt-comment-meta">
                            <span className="yt-comment-author">{c.authorDisplayName || 'Anonymous'}</span>
                            <span className="text-muted yt-comment-time">{timeAgo(c.publishedAt || c.updatedAt)}</span>
                            {(c.likeCount > 0) && (
                              <span className="yt-comment-likes">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                                </svg>
                                {formatCount(c.likeCount)}
                              </span>
                            )}
                          </div>
                          <p className="yt-comment-text">{c.textDisplay || c.textOriginal}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more */}
                  {nextPageToken && !commentsLoading && (
                    <button
                      id="yt-load-more-comments"
                      className="btn btn-ghost btn-sm yt-load-more"
                      onClick={() => loadComments(nextPageToken, false)}
                    >
                      Load more comments
                    </button>
                  )}
                  {commentsLoading && comments.length > 0 && (
                    <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', padding: '8px 0' }}>Loading…</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ── Related videos sidebar ───────────────────────────────────── */}
        <aside className="watch-sidebar" aria-label="Related videos">
          <h2 className="watch-sidebar-title">Related Videos</h2>
          <div className="watch-related-list">
            {relatedVideos.length === 0 && (
              <p className="text-muted" style={{ fontSize: 13 }}>No related videos</p>
            )}
            {relatedVideos.map((v) => {
              const vid        = typeof v.id === 'string' ? v.id : v.id?.videoId;
              if (!vid) return null;
              const relThumb   = v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '';
              const relTitle   = v.snippet?.title   || 'Untitled';
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
