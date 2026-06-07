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

  addVideo: (playlistId, videoId) =>
    apiFetch(`/playlists/add/${videoId}/${playlistId}`, { method: 'PATCH' }),

  removeVideo: (playlistId, videoId) =>
    apiFetch(`/playlists/remove/${videoId}/${playlistId}`, { method: 'PATCH' }),

  getUserPlaylists: (userId) =>
    apiFetch(`/playlists/user/${userId}`),
};
