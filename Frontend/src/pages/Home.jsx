import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { videoAPI } from '../api/client';
import VideoCard, { VideoCardSkeleton } from '../components/video/VideoCard';
import YouTubeVideoCard, { YouTubeVideoCardSkeleton } from '../components/video/YouTubeVideoCard';
import './Home.css';

const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

async function fetchYouTubeVideos(query, pageToken = '') {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: 12,
    key: YT_API_KEY,
    ...(pageToken ? { pageToken } : {}),
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) throw new Error('YouTube API error. Check your API key.');
  const data = await res.json();

  // Optionally enrich with statistics (view counts)
  const ids = (data.items || []).map((item) => item.id?.videoId).filter(Boolean).join(',');
  let statsMap = {};
  if (ids) {
    const statsParams = new URLSearchParams({ part: 'statistics', id: ids, key: YT_API_KEY });
    try {
      const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        (statsData.items || []).forEach((v) => {
          statsMap[v.id] = v.statistics;
        });
      }
    } catch (_) { /* stats enrichment is optional */ }
  }

  const enriched = (data.items || []).map((item) => ({
    ...item,
    statistics: statsMap[item.id?.videoId] || {},
  }));

  return { items: enriched, nextPageToken: data.nextPageToken || null };
}

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  // YouTube pagination uses tokens instead of page numbers
  const [ytNextPageToken, setYtNextPageToken] = useState(null);

  const query = searchParams.get('query') || '';
  const isYouTubeSearch = !!query && !!YT_API_KEY;

  // ── YouTube search fetch ──────────────────────────────────────────────────
  const fetchYouTube = useCallback(async (q, token = '', reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const { items, nextPageToken } = await fetchYouTubeVideos(q, token);
      setVideos((prev) => reset ? items : [...prev, ...items]);
      setYtNextPageToken(nextPageToken);
      setHasMore(!!nextPageToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Own backend fetch ─────────────────────────────────────────────────────
  const fetchVideos = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = { page: pageNum, limit: 12 };
      if (query) params.query = query;

      const res = await videoAPI.getAll(params);
      const fetched = res?.data?.docs || res?.data || [];
      const totalPages = res?.data?.totalPages || 1;

      setVideos((prev) => reset || pageNum === 1 ? fetched : [...prev, ...fetched]);
      setHasMore(pageNum < totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query]);

  // ── Effect: refetch when query changes ───────────────────────────────────
  useEffect(() => {
    setVideos([]);
    setError(null);
    setYtNextPageToken(null);
    setPage(1);
    if (isYouTubeSearch) {
      fetchYouTube(query, '', true);
    } else {
      fetchVideos(1, true);
    }
  }, [query, isYouTubeSearch, fetchYouTube, fetchVideos]);

  const loadMore = () => {
    if (isYouTubeSearch) {
      fetchYouTube(query, ytNextPageToken);
    } else {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideos(nextPage);
    }
  };

  const youtubeSearchUrl = query
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    : null;

  return (
    <main id="home-page">
      <div className="page-header">
        <h1 className="page-title">
          {query ? (
            <>Results for <span className="text-accent">"{query}"</span></>
          ) : 'Explore Videos'}
        </h1>

        {isYouTubeSearch && youtubeSearchUrl && (
          <a
            href={youtubeSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm yt-open-btn"
            id="open-youtube-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.75 12.06 12.06 0 0 0-8.6 0A4.83 4.83 0 0 1 3.45 6.7C2.28 8.35 2 10.13 2 12s.29 3.65 1.45 5.31a4.83 4.83 0 0 1 3.77 2.75 12.06 12.06 0 0 0 8.6 0 4.83 4.83 0 0 1 3.77-2.75C20.72 15.65 21 13.87 21 12s-.28-3.65-1.41-5.31zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
            </svg>
            Open on YouTube
          </a>
        )}

        {/* No API key banner */}
        {query && !YT_API_KEY && (
          <div className="yt-no-key-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Add <code>VITE_YOUTUBE_API_KEY</code> to your <code>.env</code> to see YouTube results
          </div>
        )}
      </div>

      {error && (
        <div className="home-error">
          <p>⚠️ {error}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => isYouTubeSearch ? fetchYouTube(query, '', true) : fetchVideos(1, true)}>
            Retry
          </button>
        </div>
      )}

      <div className="video-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) =>
              isYouTubeSearch
                ? <YouTubeVideoCardSkeleton key={i} />
                : <VideoCardSkeleton key={i} />
            )
          : isYouTubeSearch
            ? videos.map((video, i) => <YouTubeVideoCard key={video.id?.videoId || i} video={video} />)
            : videos.map((video) => <VideoCard key={video._id} video={video} />)
        }
      </div>

      {!loading && videos.length === 0 && !error && (
        <div className="home-empty">
          <div className="empty-icon">🎬</div>
          <h2>No videos found</h2>
          <p className="text-muted">{query ? 'Try different search terms.' : 'Be the first to upload!'}</p>
        </div>
      )}

      {hasMore && !loading && (
        <div className="home-load-more">
          <button
            id="load-more-btn"
            className="btn btn-ghost"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </main>
  );
}
