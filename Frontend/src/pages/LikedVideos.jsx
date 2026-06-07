import { useState, useEffect } from 'react';
import { likeAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import VideoCard, { VideoCardSkeleton } from '../components/video/VideoCard';

export default function LikedVideos() {
  const toast = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    likeAPI.getLikedVideos()
      .then(res => {
        // Extract actual video objects from likes
        const data = res?.data || [];
        const vids = data.map(item => item.likedVideo || item).filter(Boolean);
        setVideos(vids);
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main id="liked-page">
      <div className="page-header">
        <h1 className="page-title">Liked Videos</h1>
      </div>

      {loading ? (
        <div className="video-grid">
          {Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : videos.length > 0 ? (
        <div className="video-grid">
          {videos.map(v => <VideoCard key={v._id} video={v} />)}
        </div>
      ) : (
        <div className="home-empty">
          <div className="empty-icon">👍</div>
          <h2>No liked videos yet</h2>
          <p className="text-muted">Videos you like will appear here.</p>
        </div>
      )}
    </main>
  );
}
