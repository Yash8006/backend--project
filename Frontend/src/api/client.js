const BASE_URL = import.meta.env.VITE_API_BASE || '/api/v1';

/**
 * Core fetch wrapper — handles JSON, credentials (cookies), and error responses.
 * Automatically retries once with a refreshed token if a 401 is received.
 */
async function apiFetch(endpoint, options = {}, isRetry = false) {
  const url = `${BASE_URL}${endpoint}`;

  const defaultOptions = {
    credentials: 'include', // send cookies (accessToken, refreshToken)
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Don't set Content-Type if body is FormData (browser sets boundary automatically)
  if (options.body instanceof FormData) {
    delete defaultOptions.headers['Content-Type'];
  }

  let response;
  try {
    response = await fetch(url, defaultOptions);
  } catch (networkError) {
    throw new Error('Network error: Unable to reach the server.');
  }

  // Token expired — try to refresh once
  if (response.status === 401 && !isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch(endpoint, options, true); // retry original request
    } else {
      // Refresh failed — clear local state signal
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  // Parse JSON body
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let message;
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      message = 'Cannot connect to the server. Make sure the backend is running on port 8000.';
    } else {
      message = data?.message || `Request failed with status ${response.status}`;
    }
    throw new Error(message);
  }

  return data;
}

async function tryRefreshToken() {
  try {
    const res = await fetch(`${BASE_URL}/users/refreshtoken`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (formData) =>
    apiFetch('/users/register', { method: 'POST', body: formData }),

  login: (body) =>
    apiFetch('/users/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    apiFetch('/users/logout', { method: 'POST' }),

  refreshToken: () =>
    apiFetch('/users/refreshtoken', { method: 'POST' }),

  getCurrentUser: () =>
    apiFetch('/users/user-info'),

  updateProfile: (body) =>
    apiFetch('/users/update-profile', { method: 'PATCH', body: JSON.stringify(body) }),

  updateAvatar: (formData) =>
    apiFetch('/users/update-avatar', { method: 'PATCH', body: formData }),

  updateCoverImage: (formData) =>
    apiFetch('/users/update-cover', { method: 'PATCH', body: formData }),

  getChannelProfile: (username) =>
    apiFetch(`/users/c/${username}`),

  getWatchHistory: () =>
    apiFetch('/users/watch-history'),

  addToWatchHistory: (videoId) =>
    apiFetch(`/users/watch-history/${videoId}`, { method: 'PATCH' }),

  // YouTube watch history
  addYouTubeToHistory: (body) =>
    apiFetch('/users/yt-watch-history', { method: 'POST', body: JSON.stringify(body) }),

  getYouTubeWatchHistory: () =>
    apiFetch('/users/yt-watch-history'),

  clearYouTubeHistory: () =>
    apiFetch('/users/yt-watch-history', { method: 'DELETE' }),

  removeFromYouTubeHistory: (youtubeId) =>
    apiFetch(`/users/yt-watch-history/${encodeURIComponent(youtubeId)}`, { method: 'DELETE' }),

  changePassword: (body) =>
    apiFetch('/users/change-password', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Videos ─────────────────────────────────────────────────────────────────

export const videoAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/videos${qs ? `?${qs}` : ''}`);
  },

  getById: (videoId) =>
    apiFetch(`/videos/${videoId}`),

  publish: (formData) =>
    apiFetch('/videos/publish-video', { method: 'POST', body: formData }),

  update: (videoId, body) =>
    apiFetch(`/videos/${videoId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (videoId) =>
    apiFetch(`/videos/${videoId}`, { method: 'DELETE' }),
};

// ─── Comments ────────────────────────────────────────────────────────────────

export const commentAPI = {
  getVideoComments: (videoId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/comments/${videoId}${qs ? `?${qs}` : ''}`);
  },

  addComment: (videoId, body) =>
    apiFetch(`/comments/${videoId}`, { method: 'POST', body: JSON.stringify({ content: body }) }),

  updateComment: (commentId, body) =>
    apiFetch(`/comments/c/${commentId}`, { method: 'PATCH', body: JSON.stringify({ content: body }) }),

  deleteComment: (commentId) =>
    apiFetch(`/comments/c/${commentId}`, { method: 'DELETE' }),
};

// ─── Likes ───────────────────────────────────────────────────────────────────

export const likeAPI = {
  toggleVideoLike: (videoId) =>
    apiFetch(`/likes/toggle/v/${videoId}`, { method: 'POST' }),

  toggleCommentLike: (commentId) =>
    apiFetch(`/likes/toggle/c/${commentId}`, { method: 'POST' }),

  getLikedVideos: () =>
    apiFetch('/likes/videos'),
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptionAPI = {
  toggleSubscription: (channelId) =>
    apiFetch(`/subscription/c/${channelId}`, { method: 'POST' }),

  getChannelSubscribers: (channelId) =>
    apiFetch(`/subscription/c/${channelId}`),

  getSubscribedChannels: (subscriberId) =>
    apiFetch(`/subscription/u/${subscriberId}`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardAPI = {
  getStats: () =>
    apiFetch('/dashboard/stats'),

  getChannelVideos: () =>
    apiFetch('/dashboard/videos'),
};

// ─── Playlists ───────────────────────────────────────────────────────────────

export const playlistAPI = {
  create: (body) =>
    apiFetch('/playlists/', { method: 'POST', body: JSON.stringify(body) }),

  getById: (playlistId) =>
    apiFetch(`/playlists/${playlistId}`),

  update: (playlistId, body) =>
    apiFetch(`/playlists/${playlistId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (playlistId) =>
    apiFetch(`/playlists/${playlistId}`, { method: 'DELETE' }),

  // videoMeta: { title, thumbnail, channelTitle, channelId }
  addVideo: (playlistId, youtubeId, videoMeta = {}) =>
    apiFetch(`/playlists/add/${encodeURIComponent(youtubeId)}/${playlistId}`, {
      method: 'PATCH',
      body: JSON.stringify(videoMeta),
    }),

  removeVideo: (playlistId, youtubeId) =>
    apiFetch(`/playlists/remove/${encodeURIComponent(youtubeId)}/${playlistId}`, { method: 'PATCH' }),

  getUserPlaylists: (userId) =>
    apiFetch(`/playlists/user/${userId}`),
};

// ─── YouTube Interaction (proxied via backend) ────────────────────────────────
// These require the user to have connected their Google/YouTube account.
// Tokens are stored server-side; browser never sees the YouTube OAuth token.

export const ytInteractAPI = {
  // Check if the user's YouTube account is connected
  getStatus: () =>
    apiFetch('/auth/youtube-status'),

  // Like / Dislike / Remove rating   rating: 'like' | 'dislike' | 'none'
  rate: (videoId, rating) =>
    apiFetch('/auth/yt/like', { method: 'POST', body: JSON.stringify({ videoId, rating }) }),

  // Get the current user's rating for a video
  getRating: (videoId) =>
    apiFetch(`/auth/yt/rating?videoId=${encodeURIComponent(videoId)}`),

  // Get comments for a video (paginated)
  getComments: (videoId, pageToken = '') =>
    apiFetch(`/auth/yt/comments?videoId=${encodeURIComponent(videoId)}${pageToken ? `&pageToken=${pageToken}` : ''}`),

  // Post a new top-level comment
  postComment: (videoId, text) =>
    apiFetch('/auth/yt/comment', { method: 'POST', body: JSON.stringify({ videoId, text }) }),

  // Subscribe (subscribed=true) or Unsubscribe (subscribed=false)
  toggleSubscription: (channelId, subscribed) =>
    apiFetch('/auth/yt/subscribe', { method: 'POST', body: JSON.stringify({ channelId, subscribed }) }),

  // Check subscription status
  checkSubscription: (channelId) =>
    apiFetch(`/auth/yt/subscription?channelId=${encodeURIComponent(channelId)}`),

  // Get user's liked YouTube videos (from YouTube's "LL" playlist)
  getLikedVideos: (pageToken = '') =>
    apiFetch(`/auth/yt/liked-videos?maxResults=24${pageToken ? `&pageToken=${pageToken}` : ''}`),

  // Get channels the user is subscribed to on YouTube
  getSubscriptions: (pageToken = '') =>
    apiFetch(`/auth/yt/subscriptions?maxResults=24${pageToken ? `&pageToken=${pageToken}` : ''}`),

  // Search YouTube videos via backend proxy (to bypass referrer restrictions)
  search: (query, key, pageToken = '') =>
    apiFetch(`/auth/yt/search?q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`),

  // Get channel stats and details via backend proxy
  getChannelStats: (channelId, key) =>
    apiFetch(`/auth/yt/channel-stats?channelId=${encodeURIComponent(channelId)}&key=${encodeURIComponent(key)}`),

  // Get logged-in user's own YouTube channel stats
  getMyChannelStats: () =>
    apiFetch('/auth/yt/my-channel-stats'),
};

