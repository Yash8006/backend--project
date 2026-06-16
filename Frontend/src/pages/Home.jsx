import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ytInteractAPI, authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import YouTubeVideoCard, { YouTubeVideoCardSkeleton } from '../components/video/YouTubeVideoCard';
import AddToPlaylistModal from '../components/playlist/AddToPlaylistModal';
import { saveSearch, getSearchHistory } from '../utils/searchHistory';
import './PersonalizedHome.css';

const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(fullName) {
  if (!fullName) return 'there';
  return fullName.split(' ')[0];
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
  return `${Math.floor(days / 30)}mo ago`;
}

function formatViews(count) {
  if (!count) return '';
  const n = parseInt(count, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}


// ─── Genre Definitions ────────────────────────────────────────────────────────
// Each genre has: id, label, emoji, keywords (for detection), trendingQuery (what to search)

const GENRE_DEFINITIONS = [

  {
    id: 'music',
    label: 'Music',
    emoji: '🎵',
    trendingQuery: 'trending songs music 2024',
    keywords: [
      'song', 'music', 'album', 'bollywood', 'rap', 'lofi', 'playlist',
      'singer', 'band', 'lyrics', 'dj', 'remix', 'beats', 'hip hop',
      'indie', 'classical', 'arijit', 'atif', 'badshah', 'divine',
      'raftaar', 'nucleya', 'punjabi', 'ghazal', 'sufi',
    ],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    trendingQuery: 'gaming trending 2024',
    keywords: [
      'gaming', 'game', 'gameplay', 'minecraft', 'pubg', 'valorant',
      'gta', 'fortnite', 'esports', 'roblox', 'free fire', 'bgmi',
      'streamer', 'twitch', 'cod', 'call of duty', 'elden ring',
      'among us', 'brawl stars', 'clash royale',
    ],
  },
  {
    id: 'tech',
    label: 'Tech & Programming',
    emoji: '💻',
    trendingQuery: 'programming tutorial coding 2024',
    keywords: [
      'react', 'javascript', 'python', 'programming', 'coding', 'developer',
      'software', 'web development', 'machine learning', 'ai', 'tech',
      'computer science', 'node', 'typescript', 'html', 'css', 'java',
      'c++', 'rust', 'flutter', 'docker', 'kubernetes', 'aws', 'firebase',
      'mongodb', 'sql', 'graphql', 'devops', 'git', 'linux', 'backend',
      'frontend', 'data science', 'django', 'fastapi', 'express',
    ],
  },
  {
    id: 'cooking',
    label: 'Cooking & Food',
    emoji: '🍳',
    trendingQuery: 'cooking recipe trending 2024',
    keywords: [
      'recipe', 'cooking', 'food', 'chef', 'kitchen', 'baking',
      'restaurant', 'khana', 'biryani', 'cuisine', 'masterchef',
      'street food', 'healthy food', 'diet recipe', 'indian food',
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness & Health',
    emoji: '💪',
    trendingQuery: 'fitness workout trending 2024',
    keywords: [
      'workout', 'gym', 'fitness', 'yoga', 'exercise', 'weight loss',
      'bodybuilding', 'health', 'diet', 'nutrition', 'meditation',
      'abs workout', 'home workout', 'calisthenics',
    ],
  },
  {
    id: 'movies',
    label: 'Movies & Shows',
    emoji: '🎬',
    trendingQuery: 'movie trailer review trending 2024',
    keywords: [
      'movie', 'film', 'review', 'trailer', 'web series', 'netflix',
      'amazon prime', 'hotstar', 'ott', 'cinema', 'actor', 'actress',
      'series', 'episode', 'season', 'imdb', 'bollywood movie', 'hollywood',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    emoji: '📚',
    trendingQuery: 'education study learning trending',
    keywords: [
      'lecture', 'study', 'exam', 'learn', 'course', 'education',
      'upsc', 'jee', 'neet', 'class', 'teacher', 'school', 'college',
      'university', 'maths', 'science', 'physics', 'chemistry', 'biology',
      'history', 'geography', 'english grammar',
    ],
  },
  {
    id: 'news',
    label: 'News & Politics',
    emoji: '📰',
    trendingQuery: 'trending news India 2024',
    keywords: [
      'news', 'politics', 'current affairs', 'election', 'government',
      'breaking news', 'interview', 'parliament', 'minister', 'debate',
      'economic', 'budget', 'modi', 'india news',
    ],
  },
  {
    id: 'travel',
    label: 'Travel & Vlogs',
    emoji: '✈️',
    trendingQuery: 'travel vlog trending 2024',
    keywords: [
      'travel', 'vlog', 'tour', 'trip', 'adventure', 'explore',
      'destination', 'backpacking', 'hotel', 'resort', 'road trip',
      'budget travel', 'solo travel', 'foreign',
    ],
  },
  {
    id: 'sports',
    label: 'Sports',
    emoji: '⚽',
    trendingQuery: 'sports highlights trending 2024',
    keywords: [
      'cricket', 'football', 'ipl', 'sports', 'match', 'highlights',
      'world cup', 'tournament', 'dhoni', 'virat', 'ronaldo', 'messi',
      'basketball', 'tennis', 'f1', 'formula 1', 'kabaddi', 'hockey',
    ],
  },
  {
    id: 'fashion',
    label: 'Fashion & Beauty',
    emoji: '👗',
    trendingQuery: 'fashion beauty trending 2024',
    keywords: [
      'fashion', 'beauty', 'makeup', 'skincare', 'outfit', 'style',
      'clothing', 'hairstyle', 'grooming', 'lookbook', 'tutorial beauty',
      'ootd', 'thrift', 'streetwear',
    ],
  },
];

/**
 * Score genres from BOTH search history AND watch history.
 * Recent searches are weighted more heavily.
 * Returns genres sorted by score (highest first).
 */
function scoreGenresFromActivity(searchHistory, watchHistory) {
  const scores = {};
  const now = Date.now();
  const DAY = 86_400_000;

  // Search history: recent searches carry more weight
  for (const entry of searchHistory) {
    const age = now - entry.at;
    const weight = age < DAY        ? 15   // searched today
                 : age < 7 * DAY   ? 8    // this week
                 : age < 30 * DAY  ? 4    // this month
                 : 1;                     // older
    const q = entry.q.toLowerCase();
    for (const genre of GENRE_DEFINITIONS) {
      if (genre.keywords.some(kw => q.includes(kw))) {
        scores[genre.id] = (scores[genre.id] || 0) + weight;
      }
    }
  }

  // Watch history: each video adds a small signal
  for (const video of (watchHistory || [])) {
    const text = `${video.title || ''} ${video.channelTitle || ''}`.toLowerCase();
    for (const genre of GENRE_DEFINITIONS) {
      if (genre.keywords.some(kw => text.includes(kw))) {
        scores[genre.id] = (scores[genre.id] || 0) + 2;
      }
    }
  }

  // Return matching genres sorted by score
  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => GENRE_DEFINITIONS.find(g => g.id === id))
    .filter(Boolean);
}

async function fetchYT(query, pageToken = '') {
  const res = await ytInteractAPI.search(query, YT_API_KEY, pageToken);
  if (!res?.success || !res?.data) throw new Error(res?.message || 'YouTube API error');
  return { items: res.data.items || [], nextPageToken: res.data.nextPageToken || null };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Mini horizontal card used in all personalized rows */
function PhVideoCard({ video, badge, badgeColor, topic, onRemove }) {
  const [showModal, setShowModal] = useState(false);
  const { id, snippet, statistics, isProgress, progress, duration } = video;
  const videoId = typeof id === 'string' ? id : id?.videoId;
  const title = snippet?.title || video.title || 'Untitled';
  const channelTitle = snippet?.channelTitle || video.channelTitle || '';
  const thumbnail =
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.default?.url ||
    video.thumbnail ||
    '';
  const viewCount = statistics?.viewCount || video.viewCount;
  const publishedAt = snippet?.publishedAt || video.publishedAt;

  return (
    <>
      <Link
        to={`/yt-watch/${videoId}`}
        state={{ snippet, statistics }}
        className="ph-video-card"
        id={`ph-card-${videoId}`}
      >
        <div className="ph-video-thumb-wrap">
          {thumbnail ? (
            <img src={thumbnail} alt={title} className="ph-video-thumb" loading="lazy" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff0000" opacity="0.4">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
              </svg>
            </div>
          )}

          <div className="ph-video-play-overlay">
            <div className="ph-play-circle">▶</div>
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

          {onRemove && (
            <button
              className="ph-video-card-remove-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(videoId);
              }}
              title="Remove from Continue Watching"
            >
              ×
            </button>
          )}

          {badge && (
            <span
              style={{
                position: 'absolute', top: 8, left: 8, zIndex: 2,
                background: badgeColor || 'var(--accent)',
                color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '3px 8px', borderRadius: 99,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {badge}
            </span>
          )}

          {topic && (
            <span className="ph-topic-badge">{topic}</span>
          )}

          {isProgress && duration && (
            <div className="ph-video-progress">
              <div
                className="ph-video-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, (progress / duration) * 100))}%` }}
              />
            </div>
          )}
        </div>

        <div className="ph-video-info">
          <p className="ph-video-title">{title}</p>
          <p className="ph-video-channel">{channelTitle}</p>
          {isProgress ? (
            <p className="ph-video-meta" style={{ color: 'var(--accent)', fontWeight: 600 }}>▶ Continue Watching</p>
          ) : (
            <p className="ph-video-meta">
              {viewCount ? `${formatViews(viewCount)} views` : ''}
              {viewCount && publishedAt ? ' · ' : ''}
              {publishedAt ? timeAgo(publishedAt) : ''}
            </p>
          )}
        </div>
      </Link>
      {showModal && (
        <AddToPlaylistModal
          video={video}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/** Skeleton placeholder card for horizontal rows */
function PhCardSkeleton() {
  return (
    <div className="ph-card-skeleton">
      <div className="skeleton ph-card-skeleton-thumb" />
      <div className="ph-card-skeleton-info">
        <div className="skeleton" style={{ height: 12, width: '88%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 10, width: '60%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 10, width: '40%', borderRadius: 4 }} />
      </div>
    </div>
  );
}

/** A horizontal scrollable row section */
function VideoRow({ label, title, emoji, videos, loading, seeAllHref, seeAllLabel, badge, badgeColor, topic, emptyMessage, onRemove }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
    }
  };

  return (
    <section className="video-row-section" aria-label={title}>
      <div className="video-row-header">
        <div className="video-row-title-group">
          {label && <p className="video-row-label">{label}</p>}
          <h2 className="video-row-title">
            {emoji && <span className="video-row-title-emoji">{emoji}</span>}
            {title}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background var(--transition)',
            }}
          >‹</button>
          <button
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background var(--transition)',
            }}
          >›</button>
          {seeAllHref && (
            <Link to={seeAllHref} className="video-row-see-all">{seeAllLabel || 'See all'}</Link>
          )}
        </div>
      </div>

      <div className="video-row-scroll" ref={scrollRef}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <PhCardSkeleton key={i} />)
          : videos.length > 0
            ? videos.map((v, i) => (
                <PhVideoCard
                  key={v.id?.videoId || v.videoId || v.youtubeId || v.id || i}
                  video={v}
                  badge={badge}
                  badgeColor={badgeColor}
                  topic={topic}
                  onRemove={onRemove}
                />
              ))
            : (
              <div className="ph-row-empty">
                <span style={{ fontSize: 20 }}>🎬</span>
                <span>{emptyMessage || 'Nothing here yet.'}</span>
              </div>
            )
        }
      </div>
    </section>
  );
}

// ─── Main Home Component ──────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');

  // Keep input in sync with URL
  useEffect(() => {
    setSearchQuery(searchParams.get('query') || '');
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ query: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  };

  const rawQuery = searchParams.get('query') || '';
  const isSearchMode = !!rawQuery.trim();

  // ── Data state ────────────────────────────────────────────
  const [watchHistory, setWatchHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [ytConnected,  setYtConnected]  = useState(false);

  // ── Search mode state ──────────────────────────────────────────────
  const [searchVideos, setSearchVideos] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchNextToken, setSearchNextToken] = useState(null);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Save every search query to localStorage for personalisation ──────────────
  useEffect(() => {
    if (rawQuery.trim()) saveSearch(rawQuery.trim());
  }, [rawQuery]);

  // ── Load personalized data on mount ───────────────────────────────
  useEffect(() => {
    if (isSearchMode || !user) return;

    // A. Watch history
    authAPI.getYouTubeWatchHistory()
      .then(res => {
        const history = res?.data || [];
        setWatchHistory(history);
      })
      .catch(() => {});

    // B. YouTube connection status
    ytInteractAPI.getStatus()
      .then(res => {
        const connected = res?.data?.connected === true;
        setYtConnected(connected);
      })
      .catch(() => {});

    // C. Continue watching (localStorage)
    try {
      const progressMap = JSON.parse(localStorage.getItem('video_tube_watch_progress') || '{}');
      const inProgress = Object.values(progressMap)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8)
        .map(item => ({
          id: { videoId: item.youtubeId },
          snippet: {
            title: item.title,
            channelTitle: item.channelTitle,
            thumbnails: { medium: { url: item.thumbnail } },
          },
          statistics: {},
          isProgress: true,
          progress: item.progress,
          duration: item.duration,
        }));
      setContinueWatching(inProgress);
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSearchMode]);

  // ── Search mode: fetch when query changes ──────────────────────────
  const fetchSearch = useCallback(async (q, token = '', reset = false) => {
    try {
      if (reset) setSearchLoading(true);
      else setLoadingMore(true);
      const { items, nextPageToken } = await fetchYT(q, token);

      setSearchVideos(prev => {
        const next = reset ? items : [...prev, ...items];
        if (reset) {
          // Inject continue-watching card if applicable
          try {
            const progressMap = JSON.parse(localStorage.getItem('video_tube_watch_progress') || '{}');
            const inProgressList = Object.values(progressMap);
            if (inProgressList.length > 0) {
              inProgressList.sort((a, b) => b.timestamp - a.timestamp);
              const latest = inProgressList[0];
              const inProgressVideo = {
                id: { videoId: latest.youtubeId },
                snippet: {
                  title: latest.title,
                  channelTitle: latest.channelTitle,
                  thumbnails: { medium: { url: latest.thumbnail } },
                },
                statistics: {},
                isProgress: true,
                progress: latest.progress,
                duration: latest.duration,
              };
              const filtered = next.filter(v => {
                const vid = typeof v.id === 'string' ? v.id : v.id?.videoId;
                return vid !== latest.youtubeId;
              });
              return [inProgressVideo, ...filtered];
            }
          } catch (_) {}
        }
        return next;
      });
      setSearchNextToken(nextPageToken);
      setSearchHasMore(!!nextPageToken);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isSearchMode) return;
    setSearchVideos([]);
    setSearchError(null);
    setSearchNextToken(null);
    fetchSearch(rawQuery, '', true);
  }, [rawQuery, isSearchMode, fetchSearch]);

  const youtubeSearchUrl = rawQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(rawQuery)}`
    : null;

  // ─── SEARCH MODE UI ──────────────────────────────────────────────────────────
  if (isSearchMode) {
    return (
      <main id="home-page" className="search-results-layout">
        <div className="search-top-bar">
          <form className="gemini-search-form compact" onSubmit={handleSearchSubmit}>
            <div className="gemini-search-input-container">
              <svg className="gemini-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="gemini-search-input-top"
                type="search"
                className="gemini-search-input"
                placeholder="Search millions of YouTube videos…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search videos"
              />
            </div>
            <button id="gemini-search-btn-top" type="submit" className="gemini-search-btn" aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>

        <div className="search-results-content">
          <div className="page-header">
            <h1 className="page-title">
              Results for <span className="text-accent">"{rawQuery}"</span>
            </h1>
            {youtubeSearchUrl && (
              <a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm yt-open-btn" id="open-youtube-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                </svg>
                Open on YouTube
              </a>
            )}
            {!YT_API_KEY && (
              <div className="yt-no-key-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Add <code>VITE_YOUTUBE_API_KEY</code> to your <code>.env</code> to see YouTube results
              </div>
            )}
          </div>

          {searchError && (
            <div className="home-error">
              <p>⚠️ {searchError}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchSearch(rawQuery, '', true)}>Retry</button>
            </div>
          )}

          <div className="video-grid">
            {searchLoading
              ? Array.from({ length: 8 }).map((_, i) => <YouTubeVideoCardSkeleton key={i} />)
              : searchVideos.map((video, i) => (
                  <YouTubeVideoCard key={video.id?.videoId || video.id || i} video={video} />
                ))
            }
          </div>

          {!searchLoading && searchVideos.length === 0 && !searchError && (
            <div className="home-empty">
              <div className="empty-icon">🎬</div>
              <h2>No videos found</h2>
              <p className="text-muted">Try different search terms.</p>
            </div>
          )}

          {searchHasMore && !searchLoading && (
            <div className="home-load-more">
              <button id="load-more-btn" className="btn btn-ghost" onClick={() => fetchSearch(rawQuery, searchNextToken)} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ─── LANDING MODE UI ─────────────────────────────────────────────────────────
  const firstName = getFirstName(user?.fullName);
  const greeting = getTimeGreeting();

  const handleRemoveContinueWatching = useCallback((videoId) => {
    try {
      const progressMap = JSON.parse(localStorage.getItem('video_tube_watch_progress') || '{}');
      if (progressMap[videoId]) {
        delete progressMap[videoId];
        localStorage.setItem('video_tube_watch_progress', JSON.stringify(progressMap));
      }
      setContinueWatching(prev => prev.filter(v => {
        const vid = typeof v.id === 'string' ? v.id : v.id?.videoId;
        return vid !== videoId;
      }));
    } catch (_) {}
  }, []);

  return (
    <main id="home-page" className="gemini-layout-main">
      <div className="gemini-content-wrap">
        <h1 className="gemini-greeting-title">{greeting}, {firstName} 👋</h1>
        <p className="gemini-greeting-subtitle">What's on your mind?</p>

        <div className="gemini-search-pill-wrap">
          <form className="gemini-search-form" onSubmit={handleSearchSubmit}>
            <div className="gemini-search-input-container">
              <svg className="gemini-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="home-search-input"
                type="search"
                className="gemini-search-input"
                placeholder="Search millions of YouTube videos…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search videos"
              />
            </div>
            <button id="home-search-btn" type="submit" className="gemini-search-btn" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
          {!YT_API_KEY && (
            <div className="yt-no-key-banner" style={{ justifyContent: 'center', marginTop: 12 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Add <code>VITE_YOUTUBE_API_KEY</code> to <code>.env</code> to search videos
            </div>
          )}
        </div>
      </div>

      {continueWatching && continueWatching.length > 0 && (
        <div className="gemini-continue-watching-wrap animate-fade-in">
          <VideoRow
            title="Continue Watching"
            emoji="🕒"
            videos={continueWatching}
            onRemove={handleRemoveContinueWatching}
          />
        </div>
      )}
    </main>
  );
}
