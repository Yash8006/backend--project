import asyncHandler from '../utils/asynchandler.js';
import { ApiError }   from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User }        from '../modles/user.model.js';
import jwt             from 'jsonwebtoken';

// ─── Cookie options (same as the main auth controller) ───────────────────────
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
};

// ─── Helper: generate your app's JWT tokens ───────────────────────────────────
const generateAndRefreshTokens = async (userId) => {
    const user         = await User.findById(userId);
    const accessToken  = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken  = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
};

// ─── Helper: refresh a stale YouTube token ────────────────────────────────────
const refreshYouTubeToken = async (user) => {
    if (!user.youtubeRefreshToken) {
        throw new ApiError(403, 'YouTube refresh token not available. Please reconnect your Google account.');
    }

    const params = new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: user.youtubeRefreshToken,
        grant_type:    'refresh_token',
    });

    const res  = await fetch('https://oauth2.googleapis.com/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params.toString(),
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
        throw new ApiError(403, 'Failed to refresh YouTube token. Please reconnect your Google account.');
    }

    user.youtubeAccessToken = data.access_token;
    user.youtubeTokenExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
    await user.save({ validateBeforeSave: false });

    return data.access_token;
};

// ─── Helper: get valid YouTube token (refresh if expired) ────────────────────
const getValidYouTubeToken = async (user) => {
    if (!user.youtubeAccessToken) {
        throw new ApiError(403, 'YouTube account not connected. Please sign in with Google to use this feature.');
    }

    const isExpired = user.youtubeTokenExpiry && new Date() >= new Date(user.youtubeTokenExpiry);
    if (isExpired) {
        return refreshYouTubeToken(user);
    }

    return user.youtubeAccessToken;
};

// ─────────────────────────────────────────────────────────────────────────────
//  HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called by Passport after Google redirects back to our callback URL.
 * Issues your app's JWT cookies and redirects the browser back to the frontend.
 */
export const googleAuthCallback = asyncHandler(async (req, res) => {
    // req.user is set by Passport's verify callback (passport.js)
    if (!req.user) {
        throw new ApiError(401, 'Google authentication failed');
    }

    const { accessToken, refreshToken } = await generateAndRefreshTokens(req.user._id);

    // Redirect to the frontend callback page which will read the cookies + refetch user
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';

    res
        .cookie('accessToken',  accessToken,  COOKIE_OPTIONS)
        .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
        .redirect(`${frontendURL}/auth/callback?status=success`);
});

/**
 * Returns whether the currently-logged-in user has a connected YouTube account
 * and if the token is still valid.
 */
export const getYouTubeStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('youtubeAccessToken youtubeTokenExpiry authProvider googleId');

    const connected = !!user.youtubeAccessToken;
    const expired   = connected && user.youtubeTokenExpiry && new Date() >= new Date(user.youtubeTokenExpiry);

    return res.json(new ApiResponse(200, {
        connected,
        expired,
        authProvider: user.authProvider,
    }, 'YouTube status fetched'));
});

// ── YouTube Proxy: Like / Dislike / None ──────────────────────────────────────
/**
 * POST /api/v1/auth/yt/like
 * Body: { videoId: string, rating: 'like' | 'dislike' | 'none' }
 */
export const ytLike = asyncHandler(async (req, res) => {
    const { videoId, rating } = req.body;
    if (!videoId || !['like', 'dislike', 'none'].includes(rating)) {
        throw new ApiError(400, 'videoId and a valid rating (like | dislike | none) are required');
    }

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos/rate?id=${encodeURIComponent(videoId)}&rating=${rating}`,
        {
            method:  'POST',
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    if (!ytRes.ok && ytRes.status !== 204) {
        const errData = await ytRes.json().catch(() => ({}));
        throw new ApiError(ytRes.status, errData?.error?.message || 'YouTube like action failed');
    }

    return res.json(new ApiResponse(200, { rated: rating }, `Video ${rating}d successfully`));
});

// ── YouTube Proxy: Get current like/dislike status ───────────────────────────
/**
 * GET /api/v1/auth/yt/rating?videoId=xxx
 */
export const ytGetRating = asyncHandler(async (req, res) => {
    const { videoId } = req.query;
    if (!videoId) throw new ApiError(400, 'videoId is required');

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos/getRating?id=${encodeURIComponent(videoId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await ytRes.json();
    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to get rating');
    }

    const rating = data.items?.[0]?.rating || 'none';
    return res.json(new ApiResponse(200, { rating }, 'Rating fetched'));
});

// ── YouTube Proxy: Get comments ───────────────────────────────────────────────
/**
 * GET /api/v1/auth/yt/comments?videoId=xxx&pageToken=yyy
 */
export const ytGetComments = asyncHandler(async (req, res) => {
    const { videoId, pageToken } = req.query;
    if (!videoId) throw new ApiError(400, 'videoId is required');

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const params = new URLSearchParams({
        part:       'snippet',
        videoId,
        maxResults: '20',
        order:      'relevance',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await ytRes.json();
    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to fetch comments');
    }

    return res.json(new ApiResponse(200, {
        comments:      data.items || [],
        nextPageToken: data.nextPageToken || null,
        totalResults:  data.pageInfo?.totalResults || 0,
    }, 'Comments fetched'));
});

// ── YouTube Proxy: Post a comment ─────────────────────────────────────────────
/**
 * POST /api/v1/auth/yt/comment
 * Body: { videoId: string, text: string }
 */
export const ytPostComment = asyncHandler(async (req, res) => {
    const { videoId, text } = req.body;
    if (!videoId || !text?.trim()) {
        throw new ApiError(400, 'videoId and text are required');
    }

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const ytRes = await fetch(
        'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet',
        {
            method:  'POST',
            headers: {
                Authorization:  `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                snippet: {
                    videoId,
                    topLevelComment: {
                        snippet: { textOriginal: text.trim() },
                    },
                },
            }),
        }
    );

    const data = await ytRes.json();
    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to post comment');
    }

    return res.json(new ApiResponse(201, data, 'Comment posted successfully'));
});

// ── YouTube Proxy: Subscribe / Unsubscribe ────────────────────────────────────
/**
 * POST /api/v1/auth/yt/subscribe
 * Body: { channelId: string, subscribed: boolean }
 *   subscribed=true  → subscribe
 *   subscribed=false → unsubscribe (requires subscription ID lookup first)
 */
export const ytToggleSubscription = asyncHandler(async (req, res) => {
    const { channelId, subscribed } = req.body;
    if (!channelId || subscribed === undefined) {
        throw new ApiError(400, 'channelId and subscribed (boolean) are required');
    }

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    if (subscribed) {
        // Subscribe
        const ytRes = await fetch(
            'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet',
            {
                method:  'POST',
                headers: {
                    Authorization:  `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    snippet: {
                        resourceId: {
                            kind:      'youtube#channel',
                            channelId,
                        },
                    },
                }),
            }
        );

        const data = await ytRes.json();
        if (!ytRes.ok) {
            // 409 = already subscribed
            if (ytRes.status === 409) {
                return res.json(new ApiResponse(200, { subscribed: true }, 'Already subscribed'));
            }
            throw new ApiError(ytRes.status, data?.error?.message || 'Failed to subscribe');
        }

        return res.json(new ApiResponse(200, { subscribed: true, subscriptionId: data.id }, 'Subscribed successfully'));
    } else {
        // Unsubscribe — need to find the subscription ID first
        const listRes = await fetch(
            `https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&forChannelId=${encodeURIComponent(channelId)}&maxResults=1`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const listData = await listRes.json();

        if (!listRes.ok) {
            throw new ApiError(listRes.status, listData?.error?.message || 'Failed to find subscription');
        }

        const subscriptionId = listData.items?.[0]?.id;
        if (!subscriptionId) {
            return res.json(new ApiResponse(200, { subscribed: false }, 'Not subscribed'));
        }

        const delRes = await fetch(
            `https://www.googleapis.com/youtube/v3/subscriptions?id=${encodeURIComponent(subscriptionId)}`,
            {
                method:  'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        if (!delRes.ok && delRes.status !== 204) {
            const errData = await delRes.json().catch(() => ({}));
            throw new ApiError(delRes.status, errData?.error?.message || 'Failed to unsubscribe');
        }

        return res.json(new ApiResponse(200, { subscribed: false }, 'Unsubscribed successfully'));
    }
});

// ── YouTube Proxy: Check Subscription Status ──────────────────────────────────
/**
 * GET /api/v1/auth/yt/subscription?channelId=xxx
 */
export const ytCheckSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.query;
    if (!channelId) throw new ApiError(400, 'channelId is required');

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&forChannelId=${encodeURIComponent(channelId)}&maxResults=1`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await ytRes.json();
    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to check subscription');
    }

    const subscribed = (data.items?.length || 0) > 0;
    return res.json(new ApiResponse(200, { subscribed, channelId }, 'Subscription status fetched'));
});

// ── YouTube Proxy: Get Liked Videos ──────────────────────────────────────────
/**
 * GET /api/v1/auth/yt/liked-videos?pageToken=xxx&maxResults=24
 *
 * YouTube stores liked videos in the special playlist "LL" (liked list).
 * We fetch its items and enrich with video details (thumbnails, stats).
 */
export const ytGetLikedVideos = asyncHandler(async (req, res) => {
    const { pageToken, maxResults = '24' } = req.query;

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    // Step 1: fetch the "Liked Videos" playlist items
    const playlistParams = new URLSearchParams({
        part:       'snippet,contentDetails',
        playlistId: 'LL',              // "LL" is always the user's Liked Videos playlist
        maxResults: String(Math.min(Number(maxResults), 50)),
    });
    if (pageToken) playlistParams.set('pageToken', pageToken);

    const plRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const plData = await plRes.json();

    if (!plRes.ok) {
        throw new ApiError(plRes.status, plData?.error?.message || 'Failed to fetch liked videos');
    }

    const items = plData.items || [];
    if (items.length === 0) {
        return res.json(new ApiResponse(200, {
            videos:        [],
            nextPageToken: plData.nextPageToken || null,
            totalResults:  plData.pageInfo?.totalResults || 0,
        }, 'Liked videos fetched'));
    }

    // Step 2: fetch video details (title, thumbnails, channel, stats) in one batch
    const videoIds = items
        .map(i => i.contentDetails?.videoId)
        .filter(Boolean)
        .join(',');

    const vidRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${encodeURIComponent(videoIds)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const vidData = await vidRes.json();

    // Build a lookup map  videoId → video details
    const videoMap = {};
    for (const v of vidData.items || []) {
        videoMap[v.id] = v;
    }

    // Combine playlist order with video details
    const videos = items
        .map(item => {
            const videoId = item.contentDetails?.videoId;
            const detail  = videoMap[videoId];
            if (!videoId || !detail) return null;
            return {
                videoId,
                title:        detail.snippet?.title || '',
                thumbnail:    detail.snippet?.thumbnails?.medium?.url || detail.snippet?.thumbnails?.default?.url || '',
                channelTitle: detail.snippet?.channelTitle || '',
                channelId:    detail.snippet?.channelId    || '',
                publishedAt:  detail.snippet?.publishedAt  || '',
                viewCount:    detail.statistics?.viewCount || '0',
                likeCount:    detail.statistics?.likeCount || '0',
                likedAt:      item.snippet?.publishedAt    || '',  // when it was added to the liked list
            };
        })
        .filter(Boolean);

    return res.json(new ApiResponse(200, {
        videos,
        nextPageToken: plData.nextPageToken || null,
        totalResults:  plData.pageInfo?.totalResults || 0,
    }, 'Liked videos fetched'));
});

// ── YouTube Proxy: Get Subscribed Channels ────────────────────────────────────
/**
 * GET /api/v1/auth/yt/subscriptions?pageToken=xxx&maxResults=24
 *
 * Returns the list of YouTube channels the user is subscribed to,
 * ordered by activity (most recently active channel first).
 */
export const ytGetSubscriptions = asyncHandler(async (req, res) => {
    const { pageToken, maxResults = '24' } = req.query;

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const params = new URLSearchParams({
        part:       'snippet',
        mine:       'true',
        order:      'alphabetical',
        maxResults: String(Math.min(Number(maxResults), 50)),
    });
    if (pageToken) params.set('pageToken', pageToken);

    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await ytRes.json();

    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to fetch subscriptions');
    }

    const channels = (data.items || []).map(item => ({
        subscriptionId: item.id,
        channelId:      item.snippet?.resourceId?.channelId || '',
        channelTitle:   item.snippet?.title                 || '',
        description:    item.snippet?.description           || '',
        thumbnail:      item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        subscribedAt:   item.snippet?.publishedAt           || '',
    }));

    return res.json(new ApiResponse(200, {
        channels,
        nextPageToken: data.nextPageToken || null,
        totalResults:  data.pageInfo?.totalResults || 0,
    }, 'Subscriptions fetched'));
});

// ── YouTube Proxy: Public Search Proxy ────────────────────────────────────────
/**
 * GET /api/v1/auth/yt/search?q=xxx&pageToken=xxx&key=xxx
 *
 * Proxies public YouTube searches through the backend, injecting Referer header
 * to bypass restricted API key issues for localhost web origins.
 */
export const ytSearchProxy = asyncHandler(async (req, res) => {
    const { q, pageToken, key } = req.query;
    if (!key) {
        throw new ApiError(400, 'API Key is required');
    }

    const params = new URLSearchParams({
        part:       'snippet',
        q:          q || '',
        type:       'video',
        maxResults: '12',
        key:        key,
    });
    if (pageToken) params.set('pageToken', pageToken);

    // Call search API with HTTP Referer header to bypass restriction
    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`,
        { headers: { 'Referer': 'http://localhost:5173/' } }
    );
    const data = await ytRes.json();

    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'YouTube search failed');
    }

    const items = data.items || [];
    const videoIds = items.map(item => item.id?.videoId).filter(Boolean).join(',');
    let statsMap = {};

    if (videoIds) {
        const statsParams = new URLSearchParams({
            part: 'statistics',
            id:   videoIds,
            key:  key,
        });
        try {
            const statsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?${statsParams}`,
                { headers: { 'Referer': 'http://localhost:5173/' } }
            );
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                for (const v of statsData.items || []) {
                    statsMap[v.id] = v.statistics;
                }
            }
        } catch (_) {}
    }

    const enriched = items.map(item => ({
        ...item,
        statistics: statsMap[item.id?.videoId] || {},
    }));

    return res.json(new ApiResponse(200, {
        items: enriched,
        nextPageToken: data.nextPageToken || null,
    }, 'YouTube search proxied successfully'));
});

// ── YouTube Proxy: Public Channel Stats Proxy ──────────────────────────────────
/**
 * GET /api/v1/auth/yt/channel-stats?channelId=xxx&key=xxx
 *
 * Proxies channel snippet and statistics requests through the backend, injecting
 * Referer header to bypass referrer key restrictions.
 */
export const ytGetChannelStats = asyncHandler(async (req, res) => {
    const { channelId, key } = req.query;
    if (!channelId || !key) {
        throw new ApiError(400, 'channelId and key are required');
    }

    const params = new URLSearchParams({
        part: 'snippet,statistics',
        id:   channelId,
        key:  key,
    });

    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${params}`,
        { headers: { 'Referer': 'http://localhost:5173/' } }
    );
    const data = await ytRes.json();

    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to fetch channel stats');
    }

    const item = data.items?.[0];
    if (!item) {
        throw new ApiError(404, 'Channel not found');
    }

    return res.json(new ApiResponse(200, {
        subscriberCount: item.statistics?.subscriberCount || '0',
        thumbnail:       item.snippet?.thumbnails?.default?.url || '',
    }, 'Channel stats fetched successfully'));
});

// ── YouTube Proxy: Authenticated User's Own YT Channel Stats ─────────────────
/**
 * GET /api/v1/auth/yt/my-channel-stats
 *
 * Fetches the logged-in user's own YouTube subscriber count and subscriptions count.
 */
export const ytGetMyChannelStats = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user || !user.youtubeAccessToken) {
        return res.json(new ApiResponse(200, { connected: false }, 'YouTube not connected'));
    }

    const token = await getValidYouTubeToken(user);

    // Fetch subscriber count
    const chanRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const chanData = await chanRes.json();
    if (!chanRes.ok) {
        throw new ApiError(chanRes.status, chanData?.error?.message || 'Failed to fetch YouTube channel info');
    }

    const channelItem = chanData.items?.[0];
    const subscriberCount = channelItem?.statistics?.subscriberCount || '0';

    // Fetch subscription count
    const subRes = await fetch(
        'https://www.googleapis.com/youtube/v3/subscriptions?part=id&mine=true&maxResults=1',
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const subData = await subRes.json();
    const subscribedCount = subRes.ok ? (subData.pageInfo?.totalResults || 0) : 0;

    return res.json(new ApiResponse(200, {
        connected: true,
        subscriberCount,
        subscribedCount,
    }, 'YouTube channel stats fetched successfully'));
});

// ── YouTube Proxy: Create Playlist ───────────────────────────────────────────
export const ytCreatePlaylist = asyncHandler(async (req, res) => {
    const { name, description = '', isPublic = false } = req.body;
    if (!name?.trim()) throw new ApiError(400, "Playlist name is required");

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const ytRes = await fetch(
        'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
        {
            method:  'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                snippet: { title: name, description: description || '' },
                status:  { privacyStatus: isPublic ? 'public' : 'private' },
            }),
        }
    );
    const data = await ytRes.json();
    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'YouTube playlist creation failed');
    }

    return res.status(201).json(new ApiResponse(201, data, "YouTube playlist created successfully"));
});

// ── YouTube Proxy: Add item to Playlist ───────────────────────────────────────
export const ytAddPlaylistItem = asyncHandler(async (req, res) => {
    const { ytPlaylistId } = req.params;
    const { youtubeId } = req.body;
    if (!ytPlaylistId || !youtubeId) {
        throw new ApiError(400, "Playlist ID and YouTube video ID are required");
    }

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const ytRes = await fetch(
        'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
        {
            method:  'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                snippet: {
                    playlistId: ytPlaylistId,
                    resourceId: { kind: 'youtube#video', videoId: youtubeId },
                },
            }),
        }
    );
    const data = await ytRes.json();
    if (!ytRes.ok) {
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to add item to YouTube playlist');
    }

    return res.status(200).json(new ApiResponse(200, data, "Item added to YouTube playlist successfully"));
});

// ── YouTube Proxy: Remove item from Playlist ──────────────────────────────────
export const ytRemovePlaylistItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    if (!itemId) throw new ApiError(400, "PlaylistItem ID is required");

    const user  = await User.findById(req.user._id);
    const token = await getValidYouTubeToken(user);

    const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?id=${encodeURIComponent(itemId)}`,
        {
            method:  'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!ytRes.ok && ytRes.status !== 204) {
        const data = await ytRes.json().catch(() => ({}));
        throw new ApiError(ytRes.status, data?.error?.message || 'Failed to remove item from YouTube playlist');
    }

    return res.status(200).json(new ApiResponse(200, {}, "Item removed from YouTube playlist successfully"));
});




