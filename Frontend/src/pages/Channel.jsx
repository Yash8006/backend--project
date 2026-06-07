import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { authAPI, subscriptionAPI, videoAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VideoCard from '../components/video/VideoCard';
import './Channel.css';

export default function Channel() {
  const { username } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    Promise.all([
      authAPI.getChannelProfile(username),
      videoAPI.getAll({ userId: '', limit: 20 }),
    ]).then(([profileRes, videosRes]) => {
      const ch = profileRes?.data?.channel;
      setChannel(ch);
      setSubscribed(ch?.isSubscribed || false);
      const allVids = videosRes?.data?.docs || videosRes?.data || [];
      setVideos(allVids);
    }).catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [username]);

  const handleSubscribe = async () => {
    if (!user) { toast.info('Please log in to subscribe'); return; }
    if (!channel?._id) return;
    setSubLoading(true);
    try {
      await subscriptionAPI.toggleSubscription(channel._id);
      setSubscribed(prev => !prev);
      setChannel(prev => ({
        ...prev,
        subscribersCount: subscribed
          ? (prev.subscribersCount || 1) - 1
          : (prev.subscribersCount || 0) + 1,
      }));
      toast.success(subscribed ? 'Unsubscribed' : 'Subscribed!');
    } catch (err) { toast.error(err.message); }
    finally { setSubLoading(false); }
  };

  if (loading) {
    return (
      <main id="channel-page" className="channel-page">
        <div className="skeleton channel-cover-skeleton" />
        <div className="channel-info-row">
          <div className="skeleton avatar-xl" style={{ borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton" style={{ height: 24, width: '40%', borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 14, width: '25%', borderRadius: 6 }} />
          </div>
        </div>
      </main>
    );
  }

  if (!channel) {
    return (
      <main id="channel-page" className="channel-page">
        <div className="channel-not-found">
          <h2>Channel not found</h2>
        </div>
      </main>
    );
  }

  return (
    <main id="channel-page" className="channel-page">
      {/* Cover image */}
      <div className="channel-cover-wrap">
        {channel.coverImage
          ? <img src={channel.coverImage} alt={`${channel.fullName} cover`} className="channel-cover-img" />
          : <div className="channel-cover-default" />
        }
        <div className="channel-cover-overlay" />
      </div>

      {/* Channel info */}
      <div className="channel-info-row">
        <img src={channel.avatar} alt={channel.username} className="avatar channel-avatar" />

        <div className="channel-meta">
          <h1 className="channel-name">{channel.fullName}</h1>
          <p className="channel-username text-muted">@{channel.username}</p>
          <div className="channel-stats">
            <span><strong>{channel.subscribersCount ?? 0}</strong> subscribers</span>
            <span className="text-muted">·</span>
            <span><strong>{channel.subscribedChannelsCount ?? 0}</strong> subscribed</span>
          </div>
        </div>

        {user && user.username !== username && (
          <button
            id="channel-subscribe-btn"
            className={`btn ${subscribed ? 'btn-ghost' : 'btn-primary'}`}
            onClick={handleSubscribe}
            disabled={subLoading}
            aria-pressed={subscribed}
            style={{ marginLeft: 'auto' }}
          >
            {subscribed ? 'Subscribed ✓' : 'Subscribe'}
          </button>
        )}
      </div>

      <hr className="divider" style={{ margin: '28px 0' }} />

      <h2 className="channel-section-title">Videos</h2>
      <div className="video-grid">
        {videos.map(v => <VideoCard key={v._id} video={v} />)}
      </div>
      {videos.length === 0 && (
        <p className="text-muted" style={{ padding: '40px 0', textAlign: 'center' }}>
          This channel hasn't posted any videos yet.
        </p>
      )}
    </main>
  );
}
