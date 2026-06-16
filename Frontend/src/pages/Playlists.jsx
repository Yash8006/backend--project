import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { playlistAPI, ytInteractAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Playlists.css';

export default function Playlists() {
  const { user } = useAuth();
  const toast = useToast();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ytConnected, setYtConnected] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch playlists and YouTube connection status
  useEffect(() => {
    if (!user?._id) return;

    const init = async () => {
      setLoading(true);
      try {
        const [plRes, ytRes] = await Promise.all([
          playlistAPI.getUserPlaylists(user._id),
          ytInteractAPI.getStatus().catch(() => ({ data: { connected: false } }))
        ]);

        if (plRes?.success) {
          setPlaylists(plRes.data || []);
        } else {
          toast.error('Failed to load playlists');
        }

        setYtConnected(ytRes?.data?.connected === true);
      } catch (err) {
        console.error(err);
        toast.error('An error occurred while fetching playlists');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user?._id]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Playlist name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await playlistAPI.create({
        name: name.trim(),
        description: description.trim(),
        isPublic
      });

      if (res?.success) {
        toast.success(
          res.data?.youtubePlaylistId
            ? 'Playlist created and synced to YouTube!'
            : 'Playlist created successfully!'
        );
        // Refresh playlists list
        setPlaylists(prev => [res.data, ...prev]);
        // Reset and close
        setName('');
        setDescription('');
        setIsPublic(false);
        setIsModalOpen(false);
      } else {
        toast.error(res?.message || 'Failed to create playlist');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create playlist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="playlists-page">
      <div className="playlists-header">
        <div>
          <h1 className="playlists-title">My Playlists</h1>
          <p className="playlists-subtitle">Create and organize custom playlists synced to YouTube</p>
        </div>
        <button className="btn-create-playlist" onClick={() => setIsModalOpen(true)}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Create Playlist
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading your playlists...</p>
        </div>
      ) : playlists.length === 0 ? (
        <div className="playlists-empty">
          <div className="playlists-empty-icon">📁</div>
          <h3>No playlists yet</h3>
          <p>Create a playlist to start saving and syncing your favorite videos.</p>
          <button className="btn-create-playlist" style={{ marginTop: '8px' }} onClick={() => setIsModalOpen(true)}>
            Create your first playlist
          </button>
        </div>
      ) : (
        <div className="playlists-grid">
          {playlists.map((playlist) => (
            <Link
              key={playlist._id}
              to={`/playlists/${playlist._id}`}
              className="playlist-card"
              id={`playlist-card-${playlist._id}`}
            >
              <div className="playlist-card-cover">
                {playlist.coverThumbnail ? (
                  <img src={playlist.coverThumbnail} alt={playlist.name} loading="lazy" />
                ) : (
                  <div className="playlist-card-cover-placeholder">📁</div>
                )}
                {playlist.youtubePlaylistId && (
                  <span className="playlist-card-yt-badge">⚡ Synced</span>
                )}
                <span className="playlist-card-count">
                  {playlist.totalVideos} {playlist.totalVideos === 1 ? 'video' : 'videos'}
                </span>
              </div>
              <div className="playlist-card-body">
                <span className="playlist-card-name">{playlist.name}</span>
                {playlist.description && (
                  <span className="playlist-card-desc">{playlist.description}</span>
                )}
                <span className="playlist-card-meta">
                  Updated {new Date(playlist.updatedAt || playlist.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <form
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreatePlaylist}
          >
            <h3 className="modal-title">Create New Playlist</h3>

            <div className="modal-field">
              <label htmlFor="playlistName">Name *</label>
              <input
                id="playlistName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                maxLength={50}
                required
                disabled={submitting}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="playlistDesc">Description (optional)</label>
              <textarea
                id="playlistDesc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A collection of great videos..."
                maxLength={200}
                disabled={submitting}
              />
            </div>

            <div className="modal-field" style={{ flexDirection: 'row', gap: '8px', margin: '20px 0 10px' }}>
              <label className="modal-field-toggle">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={submitting}
                />
                Public Playlist
              </label>
            </div>

            {ytConnected ? (
              <p style={{ fontSize: '0.78rem', color: '#10b981', margin: '0 0 16px' }}>
                ✓ Synced Mode: This playlist will automatically create and sync on your connected YouTube channel.
              </p>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                Note: Connect YouTube in settings if you want to sync this playlist to your YouTube account.
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting || !name.trim()}
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
