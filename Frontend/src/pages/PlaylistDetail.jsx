import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { playlistAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import './Playlists.css';

export default function PlaylistDetail() {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Fetch single playlist
  useEffect(() => {
    if (!playlistId) return;

    const fetchPlaylist = async () => {
      setLoading(true);
      try {
        const res = await playlistAPI.getById(playlistId);
        if (res?.success) {
          setPlaylist(res.data);
        } else {
          toast.error(res?.message || 'Failed to load playlist');
          navigate('/playlists');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error fetching playlist details');
        navigate('/playlists');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId, navigate]);

  const handleDeletePlaylist = async () => {
    if (!window.confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await playlistAPI.delete(playlistId);
      if (res?.success) {
        toast.success(
          playlist?.youtubePlaylistId
            ? 'Playlist deleted locally and from YouTube!'
            : 'Playlist deleted successfully'
        );
        navigate('/playlists');
      } else {
        toast.error(res?.message || 'Failed to delete playlist');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete playlist');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveVideo = async (e, youtubeId) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await playlistAPI.removeVideo(playlistId, youtubeId);
      if (res?.success) {
        toast.success('Video removed from playlist');
        // Update local state
        setPlaylist(prev => ({
          ...prev,
          videos: prev.videos.filter(v => v.youtubeId !== youtubeId)
        }));
      } else {
        toast.error(res?.message || 'Failed to remove video');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove video');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading playlist details...</p>
      </div>
    );
  }

  if (!playlist) return null;

  const coverVideo = playlist.videos?.[0];
  const coverUrl = coverVideo?.thumbnail || null;

  return (
    <div className="playlist-detail-page">
      <div className="playlist-detail-header">
        <div className="playlist-detail-cover">
          {coverUrl ? (
            <img src={coverUrl} alt={playlist.name} loading="lazy" />
          ) : (
            <div className="playlist-detail-cover-placeholder">📁</div>
          )}
        </div>

        <div className="playlist-detail-info">
          <h1 className="playlist-detail-name">{playlist.name}</h1>
          {playlist.description && (
            <p className="playlist-detail-desc">{playlist.description}</p>
          )}

          <div className="playlist-detail-meta">
            <span>
              {playlist.videos?.length || 0} {playlist.videos?.length === 1 ? 'video' : 'videos'}
            </span>
            {playlist.youtubePlaylistId && (
              <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
                ⚡ YouTube Synced
              </span>
            )}
            <span>
              Updated {new Date(playlist.updatedAt || playlist.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="playlist-detail-actions">
            <button
              className="btn-danger"
              onClick={handleDeletePlaylist}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Playlist'}
            </button>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', color: '#fff' }}>Videos</h2>

      {playlist.videos?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No videos in this playlist yet.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px' }}>
            Browse videos on the Home page and click "Save" to add them here.
          </p>
        </div>
      ) : (
        <div className="playlist-video-list">
          {playlist.videos.map((video, idx) => (
            <div key={video.youtubeId} className="playlist-video-row">
              <div className="playlist-video-index">{idx + 1}</div>
              <img
                src={video.thumbnail}
                alt={video.title}
                className="playlist-video-thumb"
                loading="lazy"
              />
              <div className="playlist-video-info">
                <Link
                  to={`/yt-watch/${video.youtubeId}`}
                  state={{
                    snippet: {
                      title: video.title,
                      channelTitle: video.channelTitle,
                      channelId: video.channelId,
                      thumbnails: { medium: { url: video.thumbnail } }
                    }
                  }}
                  className="playlist-video-title"
                >
                  {video.title}
                </Link>
                <div className="playlist-video-channel">{video.channelTitle}</div>
              </div>
              <button
                className="btn-remove-video"
                onClick={(e) => handleRemoveVideo(e, video.youtubeId)}
                title="Remove video from playlist"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
