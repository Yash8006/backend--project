import { useState, useEffect } from 'react';
import { playlistAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AddToPlaylistModal({ video, onClose }) {
  const { user } = useAuth();
  const toast = useToast();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  // Normalize video fields
  const videoId = video.youtubeId || video.videoId || (typeof video.id === 'string' ? video.id : video.id?.videoId);
  const title = video.title || video.snippet?.title || 'Untitled';
  const thumbnail = video.thumbnail || video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '';
  const channelTitle = video.channelTitle || video.snippet?.channelTitle || '';
  const channelId = video.channelId || video.snippet?.channelId || '';

  useEffect(() => {
    if (!user?._id) return;

    const fetchPlaylists = async () => {
      try {
        const res = await playlistAPI.getUserPlaylists(user._id);
        if (res?.success) {
          setPlaylists(res.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [user?._id]);

  const handleTogglePlaylist = async (playlist, isAlreadyAdded) => {
    try {
      if (isAlreadyAdded) {
        // Remove from playlist
        const res = await playlistAPI.removeVideo(playlist._id, videoId);
        if (res?.success) {
          toast.success(`Removed from ${playlist.name}`);
          setPlaylists(prev =>
            prev.map(p =>
              p._id === playlist._id
                ? { ...p, videos: p.videos.filter(v => v.youtubeId !== videoId) }
                : p
            )
          );
        } else {
          toast.error(res?.message || 'Failed to remove video');
        }
      } else {
        // Add to playlist
        const videoMeta = { title, thumbnail, channelTitle, channelId };
        const res = await playlistAPI.addVideo(playlist._id, videoId, videoMeta);
        if (res?.success) {
          toast.success(`Saved to ${playlist.name}`);
          setPlaylists(prev =>
            prev.map(p =>
              p._id === playlist._id
                ? {
                    ...p,
                    videos: [
                      ...p.videos,
                      { youtubeId: videoId, title, thumbnail, channelTitle, channelId }
                    ]
                  }
                : p
            )
          );
        } else {
          toast.error(res?.message || 'Failed to add video');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    }
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setCreating(true);
    try {
      // Step 1: Create the new playlist (default private)
      const createRes = await playlistAPI.create({
        name: newPlaylistName.trim(),
        description: '',
        isPublic: false
      });

      if (createRes?.success) {
        const newPlaylist = createRes.data;

        // Step 2: Immediately add the video to this new playlist
        const videoMeta = { title, thumbnail, channelTitle, channelId };
        const addRes = await playlistAPI.addVideo(newPlaylist._id, videoId, videoMeta);

        if (addRes?.success) {
          toast.success(`Playlist created and video saved to ${newPlaylist.name}`);
          // Add the fully populated playlist to our local state
          const updatedPlaylist = {
            ...newPlaylist,
            videos: [{ youtubeId: videoId, title, thumbnail, channelTitle, channelId }]
          };
          setPlaylists(prev => [updatedPlaylist, ...prev]);
          setNewPlaylistName('');
          setShowCreateForm(false);
        } else {
          toast.success(`Playlist created, but failed to save video`);
          setPlaylists(prev => [newPlaylist, ...prev]);
        }
      } else {
        toast.error(createRes?.message || 'Failed to create playlist');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="atp-overlay" onClick={onClose}>
      <div className="atp-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="atp-title">Save Video to...</h3>
          <button className="atp-close" onClick={onClose}>✕</button>
        </div>

        <div className="atp-video-info">
          <img src={thumbnail} alt={title} className="atp-video-thumb" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="atp-video-title">{title}</p>
            <p className="atp-video-channel">{channelTitle}</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 8px', width: '20px', height: '20px' }}></div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Loading playlists...</p>
          </div>
        ) : (
          <>
            <div className="atp-list">
              {playlists.map((pl) => {
                const isAdded = pl.videos?.some((v) => v.youtubeId === videoId);
                return (
                  <button
                    key={pl._id}
                    className={`atp-playlist-row ${isAdded ? 'added' : ''}`}
                    onClick={() => handleTogglePlaylist(pl, isAdded)}
                  >
                    <div className="atp-playlist-thumb">
                      {pl.videos?.[0]?.thumbnail ? (
                        <img src={pl.videos[0].thumbnail} alt={pl.name} />
                      ) : (
                        '📁'
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="atp-playlist-name">{pl.name}</div>
                      <div className="atp-playlist-count">
                        {pl.videos?.length || 0} {pl.videos?.length === 1 ? 'video' : 'videos'}
                      </div>
                    </div>
                    <div className="atp-check" style={{ fontSize: isAdded ? '1.1rem' : '0.9rem', fontWeight: 'bold' }}>
                      {isAdded ? '✓' : '+'}
                    </div>
                  </button>
                );
              })}
            </div>

            {showCreateForm ? (
              <form onSubmit={handleCreateAndAdd} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="New playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  disabled={creating}
                  autoFocus
                  required
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    style={{ padding: '5px 14px', fontSize: '0.75rem', borderRadius: '6px' }}
                    disabled={creating || !newPlaylistName.trim()}
                  >
                    {creating ? 'Creating...' : 'Create & Save'}
                  </button>
                </div>
              </form>
            ) : (
              <button className="atp-new-btn" onClick={() => setShowCreateForm(true)}>
                + Create new playlist
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
