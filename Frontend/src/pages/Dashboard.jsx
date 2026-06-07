import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, videoAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Dashboard.css';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ background: color }}>{icon}</div>
      <div>
        <p className="stat-label text-muted">{label}</p>
        <p className="stat-value">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.getStats(),
      dashboardAPI.getChannelVideos(),
    ]).then(([statsRes, videosRes]) => {
      setStats(statsRes?.data || null);
      setVideos(videosRes?.data || []);
    }).catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (videoId) => {
    if (!confirm('Delete this video?')) return;
    try {
      await videoAPI.delete(videoId);
      setVideos(prev => prev.filter(v => v._id !== videoId));
      toast.success('Video deleted');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) {
    return (
      <main id="dashboard-page" className="dashboard-page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card card skeleton" style={{ height: 90 }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main id="dashboard-page" className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Link to="/upload" id="dashboard-upload-btn" className="btn btn-primary btn-sm">
          + Upload Video
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard
          icon="👁️" label="Total Views" value={stats?.totalViews?.toLocaleString() ?? '0'}
          color="rgba(124,58,237,0.2)"
        />
        <StatCard
          icon="👥" label="Subscribers" value={stats?.totalSubscribers?.toLocaleString() ?? '0'}
          color="rgba(59,130,246,0.2)"
        />
        <StatCard
          icon="🎬" label="Total Videos" value={stats?.totalVideos?.toLocaleString() ?? '0'}
          color="rgba(34,197,94,0.2)"
        />
        <StatCard
          icon="👍" label="Total Likes" value={stats?.totalLikes?.toLocaleString() ?? '0'}
          color="rgba(245,158,11,0.2)"
        />
      </div>

      <div className="dashboard-section">
        <h2 className="dashboard-section-title">Your Videos</h2>

        {videos.length === 0 ? (
          <div className="dashboard-empty">
            <p className="text-muted">No videos yet.</p>
            <Link to="/upload" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Upload your first video</Link>
          </div>
        ) : (
          <div className="dashboard-video-list">
            {videos.map(video => (
              <div key={video._id} className="dashboard-video-item card">
                <div className="dashboard-video-thumb-wrap">
                  <img src={video.thumbnail} alt={video.title} className="dashboard-video-thumb" />
                </div>
                <div className="dashboard-video-meta">
                  <p className="dashboard-video-title">{video.title}</p>
                  <p className="text-muted" style={{ fontSize: 12 }}>
                    {video.views ?? 0} views · {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                  <span className={`badge ${video.isPublished ? 'badge-green' : 'badge-accent'}`}>
                    {video.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="dashboard-video-actions">
                  <Link
                    to={`/watch/${video._id}`}
                    id={`watch-video-${video._id}`}
                    className="btn btn-ghost btn-sm"
                  >
                    View
                  </Link>
                  <button
                    id={`delete-video-${video._id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(video._id)}
                    aria-label={`Delete ${video.title}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
