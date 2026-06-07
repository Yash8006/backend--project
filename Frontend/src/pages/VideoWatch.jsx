import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { videoAPI, commentAPI, likeAPI, subscriptionAPI, authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VideoCard from '../components/video/VideoCard';
import './VideoWatch.css';

function formatDuration(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
function formatViews(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

export default function VideoWatch() {
  const { videoId } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [relatedVideos, setRelatedVideos] = useState([]);

  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    Promise.all([
      videoAPI.getById(videoId),
      videoAPI.getAll({ limit: 8 }),
    ]).then(([videoRes, relatedRes]) => {
      setVideo(videoRes?.data || null);
      setRelatedVideos((relatedRes?.data?.docs || relatedRes?.data || []).filter(v => v._id !== videoId).slice(0, 6));

      // Silently record this video in watch history (fire-and-forget)
      // .catch(() => {}) ensures history failure never interrupts video playback
      if (user) {
        authAPI.addToWatchHistory(videoId).catch(() => {});
      }
    }).catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    setCommentsLoading(true);
    commentAPI.getVideoComments(videoId)
      .then(res => setComments(res?.data?.docs || res?.data || []))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [videoId]);

  const handleLike = async () => {
    if (!user) { toast.info('Please log in to like videos'); return; }
    setLikeLoading(true);
    try {
      await likeAPI.toggleVideoLike(videoId);
      setLiked(prev => !prev);
      toast.success(liked ? 'Like removed' : 'Video liked!');
    } catch (err) { toast.error(err.message); }
    finally { setLikeLoading(false); }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.info('Please log in to subscribe'); return; }
    if (!video?.owner?._id) return;
    setSubLoading(true);
    try {
      await subscriptionAPI.toggleSubscription(video.owner._id);
      setSubscribed(prev => !prev);
      toast.success(subscribed ? 'Unsubscribed' : 'Subscribed!');
    } catch (err) { toast.error(err.message); }
    finally { setSubLoading(false); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) { toast.info('Please log in to comment'); return; }
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await commentAPI.addComment(videoId, commentText.trim());
      const newComment = res?.data;
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      toast.success('Comment added!');
    } catch (err) { toast.error(err.message); }
    finally { setCommentLoading(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentAPI.deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      toast.success('Comment deleted');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) {
    return (
      <main id="watch-page" className="watch-page">
        <div className="watch-layout">
          <div className="watch-main">
            <div className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-lg)' }} />
            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ height: 24, width: '70%', borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main id="watch-page" className="watch-page">
        <div className="watch-not-found">
          <h2>Video not found</h2>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main id="watch-page" className="watch-page">
      <div className="watch-layout">
        {/* Player + Info */}
        <div className="watch-main">
          <div className="watch-player-wrap">
            <video
              ref={videoRef}
              id="video-player"
              className="watch-player"
              src={video.videofile}
              controls
              poster={video.thumbnail}
              aria-label={video.title}
            />
          </div>

          <div className="watch-info">
            <h1 className="watch-title">{video.title}</h1>

            <div className="watch-meta-bar">
              <div className="watch-stats">
                <span className="text-muted">{formatViews(video.views)} views</span>
                <span className="text-muted">·</span>
                <span className="text-muted">{timeAgo(video.createdAt)}</span>
                {video.duration && (
                  <>
                    <span className="text-muted">·</span>
                    <span className="text-muted">{formatDuration(video.duration)}</span>
                  </>
                )}
              </div>

              <div className="watch-actions">
                <button
                  id="like-btn"
                  className={`btn btn-ghost btn-sm ${liked ? 'liked' : ''}`}
                  onClick={handleLike}
                  disabled={likeLoading}
                  aria-pressed={liked}
                  aria-label={liked ? 'Remove like' : 'Like video'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  {liked ? 'Liked' : 'Like'}
                </button>
              </div>
            </div>

            {/* Channel info */}
            <div className="watch-channel-bar">
              {video.owner && (
                <Link to={`/channel/${video.owner.username}`} className="watch-channel-info">
                  <img src={video.owner.avatar} alt={video.owner.username} className="avatar avatar-md" />
                  <div>
                    <p className="watch-channel-name">{video.owner.fullName || video.owner.username}</p>
                    <p className="text-muted" style={{ fontSize: 12 }}>@{video.owner.username}</p>
                  </div>
                </Link>
              )}
              {user && video.owner && user._id !== video.owner._id && (
                <button
                  id="subscribe-btn"
                  className={`btn ${subscribed ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                  onClick={handleSubscribe}
                  disabled={subLoading}
                  aria-pressed={subscribed}
                >
                  {subscribed ? 'Subscribed ✓' : 'Subscribe'}
                </button>
              )}
            </div>

            {/* Description */}
            {video.description && (
              <div className="watch-description card">
                <p>{video.description}</p>
              </div>
            )}
          </div>

          {/* Comments */}
          <section className="watch-comments" aria-label="Comments section">
            <h2 className="watch-comments-title">Comments</h2>

            {user && (
              <form className="comment-form" onSubmit={handleAddComment}>
                <img src={user.avatar} alt={user.username} className="avatar avatar-sm" />
                <div className="comment-input-wrap">
                  <textarea
                    id="comment-input"
                    className="form-input"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    aria-label="Comment text"
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      id="submit-comment-btn"
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={commentLoading || !commentText.trim()}
                    >
                      {commentLoading ? 'Posting…' : 'Comment'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="comment-list">
              {commentsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="comment-skeleton" style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
                      <div className="skeleton avatar avatar-sm" />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="skeleton" style={{ height: 12, width: '30%', borderRadius: 4 }} />
                        <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))
                : comments.map((comment) => (
                    <div key={comment._id} className="comment-item">
                      <img
                        src={comment.owner?.avatar || '/placeholder.jpg'}
                        alt={comment.owner?.username || 'User'}
                        className="avatar avatar-sm"
                      />
                      <div className="comment-body">
                        <div className="comment-header">
                          <span className="comment-author">@{comment.owner?.username || 'unknown'}</span>
                          <span className="text-muted comment-time">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="comment-text">{comment.content}</p>
                        {user && user._id === comment.owner?._id && (
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ marginTop: 6, padding: '4px 10px', fontSize: 11 }}
                            onClick={() => handleDeleteComment(comment._id)}
                            aria-label="Delete comment"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              }
              {!commentsLoading && comments.length === 0 && (
                <p className="text-muted" style={{ padding: '20px 0' }}>No comments yet. Be the first!</p>
              )}
            </div>
          </section>
        </div>

        {/* Related sidebar */}
        <aside className="watch-sidebar" aria-label="Related videos">
          <h2 className="watch-sidebar-title">Related Videos</h2>
          <div className="watch-related-list">
            {relatedVideos.map(v => (
              <VideoCard key={v._id} video={v} />
            ))}
            {relatedVideos.length === 0 && (
              <p className="text-muted" style={{ fontSize: 13 }}>No related videos</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
