import { useSettings } from '../context/SettingsContext';
import { Link } from 'react-router-dom';
import './Settings.css';

function timeAgoShort(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const TIMEOUT_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
];

export default function Settings() {
  const {
    commentBlockedVideos,
    commentTimeout,
    hideShorts,
    unblockVideoComments,
    setCommentTimeout,
    toggleHideShorts,
  } = useSettings();

  const blockedEntries = Object.entries(commentBlockedVideos)
    .sort(([, a], [, b]) => b.blockedAt - a.blockedAt);

  return (
    <main id="settings-page" className="settings-page">
      {/* ── Page Title ──────────────────────────────────────────── */}
      <h1 className="settings-page-title">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Settings
      </h1>
      <p className="settings-page-subtitle">Customize your VideoTube experience</p>

      {/* ── 1. Comment Blocking ─────────────────────────────────── */}
      <section className="settings-section" id="settings-comment-blocking">
        <div className="settings-section-header">
          <div className="settings-section-icon comments">🚫</div>
          <div>
            <h2 className="settings-section-title">Comment Blocking</h2>
            <p className="settings-section-desc">
              Hide comments for specific videos. You can block from any video's watch page.
            </p>
          </div>
        </div>

        <div className="settings-section-body">
          {blockedEntries.length === 0 ? (
            <div className="settings-empty-state">
              <span className="empty-emoji">💬</span>
              <p>No blocked videos yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Go to any video's watch page and click "Block Comments" to hide comments.
              </p>
            </div>
          ) : (
            <div className="settings-blocked-list">
              {blockedEntries.map(([videoId, meta]) => (
                <div key={videoId} className="settings-blocked-item" id={`blocked-${videoId}`}>
                  <Link to={`/yt-watch/${videoId}`}>
                    {meta.thumbnail ? (
                      <img
                        src={meta.thumbnail}
                        alt={meta.title}
                        className="settings-blocked-thumb"
                      />
                    ) : (
                      <div className="settings-blocked-thumb" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, opacity: 0.3,
                      }}>
                        🎬
                      </div>
                    )}
                  </Link>
                  <div className="settings-blocked-info">
                    <p className="settings-blocked-title">{meta.title}</p>
                    {meta.channelTitle && (
                      <p className="settings-blocked-channel">{meta.channelTitle}</p>
                    )}
                    <p className="settings-blocked-date">Blocked {timeAgoShort(meta.blockedAt)}</p>
                  </div>
                  <button
                    className="settings-unblock-btn"
                    onClick={() => unblockVideoComments(videoId)}
                    id={`unblock-${videoId}`}
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="settings-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>
              Tip: On any video watch page, use the "Block Comments" button below the video to hide comments for that specific video.
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Comment Auto-Timeout ────────────────────────────── */}
      <section className="settings-section" id="settings-comment-timeout">
        <div className="settings-section-header">
          <div className="settings-section-icon timeout">⏱️</div>
          <div>
            <h2 className="settings-section-title">Comment Auto-Timeout</h2>
            <p className="settings-section-desc">
              When you temporarily view comments on a blocked video, they'll auto-hide after this duration.
            </p>
          </div>
        </div>

        <div className="settings-section-body">
          <div className="settings-timeout-controls">
            {TIMEOUT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`settings-timeout-btn ${commentTimeout === opt.value ? 'active' : ''}`}
                onClick={() => setCommentTimeout(opt.value)}
                id={`timeout-${opt.value}`}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="settings-timeout-current">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Currently set to <span className="timeout-value">
              {commentTimeout === 30 ? '30 seconds' : commentTimeout === 60 ? '1 minute' : '2 minutes'}
            </span>
          </p>
        </div>
      </section>

      {/* ── 3. Hide Shorts ─────────────────────────────────────── */}
      <section className="settings-section" id="settings-hide-shorts">
        <div className="settings-section-header">
          <div className="settings-section-icon shorts">📱</div>
          <div>
            <h2 className="settings-section-title">Hide YouTube Shorts</h2>
            <p className="settings-section-desc">
              Filter out YouTube Shorts from search results so you only see regular videos.
            </p>
          </div>
        </div>

        <div className="settings-section-body">
          <div className="settings-toggle-row">
            <div>
              <p className="settings-toggle-label">Filter Shorts from search</p>
              <p className="settings-toggle-sublabel">
                {hideShorts
                  ? 'Shorts are currently hidden from search results'
                  : 'Shorts are shown in search results'}
              </p>
            </div>
            <label className="settings-toggle" id="hide-shorts-toggle">
              <input
                type="checkbox"
                checked={hideShorts}
                onChange={toggleHideShorts}
                aria-label="Toggle hide shorts"
              />
              <span className="settings-toggle-track" />
            </label>
          </div>

          <div className="settings-hint" style={{ marginTop: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>
              Shorts are detected by keywords like "#shorts" in the video title. Some shorts without these markers may still appear.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
