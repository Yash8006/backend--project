import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ytInteractAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GoogleConnectBanner from '../components/common/GoogleConnectBanner';
import './YouTubePages.css';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  if (days  < 1)  return 'Today';
  if (days  < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Single channel card ──────────────────────────────────────────────────────

function ChannelCard({ channel, onUnsubscribe }) {
  const [unsubscribing, setUnsubscribing] = useState(false);
  const ytChannelUrl = `https://www.youtube.com/channel/${channel.channelId}`;

  const handleUnsubscribeClick = async () => {
    if (!window.confirm(`Unsubscribe from ${channel.channelTitle}?`)) return;
    setUnsubscribing(true);
    try {
      await onUnsubscribe(channel.channelId);
    } catch (_) {
      setUnsubscribing(false);
    }
  };

  return (
    <div className="sub-card card" id={`sub-${channel.channelId}`}>
      {/* Avatar */}
      <div className="sub-avatar-wrap">
        {channel.thumbnail ? (
          <img
            src={channel.thumbnail}
            alt={channel.channelTitle}
            className="sub-avatar"
            loading="lazy"
          />
        ) : (
          <div className="sub-avatar-fallback">
            {channel.channelTitle?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="sub-info">
        <p className="sub-name">{channel.channelTitle}</p>
        {channel.description ? (
          <p className="sub-desc text-muted">{channel.description}</p>
        ) : (
          <p className="sub-desc text-muted" style={{ opacity: 0.5 }}>No channel description</p>
        )}
        {channel.subscribedAt && (
          <p className="sub-date text-muted">Subscribed {timeAgo(channel.subscribedAt)}</p>
        )}
      </div>

      {/* Actions */}
      <div className="sub-actions">
        <a
          href={ytChannelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sub-visit-btn"
          aria-label={`Visit ${channel.channelTitle} on YouTube`}
        >
          Watch on YT
        </a>
        <button
          className="sub-unsubscribe-btn"
          onClick={handleUnsubscribeClick}
          disabled={unsubscribing}
        >
          {unsubscribing ? 'Leaving…' : 'Unsubscribe'}
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ChannelCardSkeleton() {
  return (
    <div className="sub-card card" style={{ pointerEvents: 'none' }}>
      <div className="skeleton sub-avatar" style={{ borderRadius: '50%', flexShrink: 0 }} />
      <div className="sub-info" style={{ gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 11, width: '30%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function YouTubeSubscriptions() {
  const toast    = useToast();
  const { user } = useAuth();

  const [ytConnected,    setYtConnected]    = useState(false);
  const [statusLoaded,   setStatusLoaded]   = useState(false);
  const [channels,       setChannels]       = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [nextPage,       setNextPage]       = useState(null);
  const [totalResults,   setTotalResults]   = useState(0);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [search,         setSearch]         = useState('');

  // ── Check YouTube connection ──────────────────────────────────────────
  useEffect(() => {
    if (!user) { setStatusLoaded(true); return; }
    ytInteractAPI.getStatus()
      .then(res => setYtConnected(res?.data?.connected === true))
      .catch(() => setYtConnected(false))
      .finally(() => setStatusLoaded(true));
  }, [user]);

  // ── Load subscriptions ────────────────────────────────────────────────
  const loadSubscriptions = useCallback(async (pageToken = '', replace = true) => {
    if (!ytConnected) return;
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await ytInteractAPI.getSubscriptions(pageToken);
      const newChannels = res?.data?.channels || [];
      setChannels(prev => replace ? newChannels : [...prev, ...newChannels]);
      setNextPage(res?.data?.nextPageToken || null);
      setTotalResults(res?.data?.totalResults || 0);
    } catch (err) {
      toast.error(err.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [ytConnected]);

  useEffect(() => {
    if (ytConnected) loadSubscriptions('', true);
  }, [ytConnected, loadSubscriptions]);

  const handleUnsubscribe = async (channelId) => {
    try {
      await ytInteractAPI.toggleSubscription(channelId, false);
      setChannels(prev => prev.filter(c => c.channelId !== channelId));
      setTotalResults(prev => Math.max(0, prev - 1));
      toast.success('Unsubscribed successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to unsubscribe');
      throw err;
    }
  };

  // ── Filtered list (client-side search) ───────────────────────────────
  const filtered = search.trim()
    ? channels.filter(c =>
        c.channelTitle.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
      )
    : channels;

  // ─────────────────────────────────────────────────────────────────────
  return (
    <main id="yt-subscriptions-page">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff0000, #cc0000)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>🔔</div>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>YouTube Subscriptions</h1>
          {!loading && totalResults > 0 && (
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
              {totalResults.toLocaleString()} channel{totalResults !== 1 ? 's' : ''} subscribed
            </p>
          )}
        </div>
      </div>

      {/* ── Not connected ─────────────────────────────────────────────── */}
      {statusLoaded && !ytConnected && (
        <div style={{ maxWidth: 480, margin: '40px auto 0' }}>
          <GoogleConnectBanner />
          <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 12 }}>
            Connect your Google account to see all the YouTube channels you subscribe to.
          </p>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {ytConnected && loading && (
        <div className="sub-grid">
          {Array.from({ length: 12 }).map((_, i) => <ChannelCardSkeleton key={i} />)}
        </div>
      )}

      {/* ── Loaded ──────────────────────────────────────────────────── */}
      {ytConnected && !loading && (
        <>
          {/* Search bar */}
          {channels.length > 4 && (
            <div style={{ marginBottom: 20 }}>
              <input
                id="sub-search-input"
                type="search"
                className="form-input"
                placeholder="Search your subscriptions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: 340 }}
              />
            </div>
          )}

          {filtered.length > 0 ? (
            <>
              <div className="sub-grid">
                {filtered.map(ch => (
                  <ChannelCard 
                    key={ch.subscriptionId || ch.channelId} 
                    channel={ch} 
                    onUnsubscribe={handleUnsubscribe} 
                  />
                ))}
              </div>

              {/* Load more — only when not searching (search is client-side) */}
              {!search && nextPage && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button
                    id="sub-load-more"
                    className="btn btn-ghost"
                    onClick={() => loadSubscriptions(nextPage, false)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : `Load more channels`}
                  </button>
                </div>
              )}

              {search && filtered.length === 0 && (
                <p className="text-muted" style={{ textAlign: 'center', marginTop: 40 }}>
                  No channels match "<strong>{search}</strong>"
                </p>
              )}
            </>
          ) : (
            <div className="home-empty" style={{ marginTop: 60 }}>
              <div className="empty-icon" style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
              <h2 style={{ marginBottom: 8 }}>No subscriptions yet</h2>
              <p className="text-muted" style={{ marginBottom: 24, maxWidth: 340, textAlign: 'center' }}>
                Channels you subscribe to on YouTube will appear here.
              </p>
              <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Explore Videos
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
