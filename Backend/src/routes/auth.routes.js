import { Router }    from 'express';
import passport       from 'passport';
import { verifyJWT }  from '../middlewares/auth.middleware.js';
import {
    googleAuthCallback,
    getYouTubeStatus,
    ytLike,
    ytGetRating,
    ytGetComments,
    ytPostComment,
    ytToggleSubscription,
    ytCheckSubscription,
    ytGetLikedVideos,
    ytGetSubscriptions,
    ytSearchProxy,
    ytGetChannelStats,
    ytGetMyChannelStats,
    ytCreatePlaylist,
    ytAddPlaylistItem,
    ytRemovePlaylistItem,
} from '../controllers/auth.controller.js';

const router = Router();

// ── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * Step 1: Redirect user to Google's consent screen.
 * accessType=offline   → request a refresh_token so we can refresh the YouTube token
 * prompt=consent       → always show consent screen (ensures refresh_token is returned)
 */
router.get('/google',
    passport.authenticate('google', {
        scope: [
            'profile',
            'email',
            'https://www.googleapis.com/auth/youtube.force-ssl',
        ],
        accessType: 'offline',
        prompt:     'consent',
    })
);

/**
 * Step 2: Google redirects here after user consents.
 * Passport verifies the code, calls our strategy verify fn, then calls googleAuthCallback.
 */
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`,
        session:         true, // needed briefly so passport can access req.user
    }),
    googleAuthCallback
);

// ── YouTube Status & Public Proxy ─────────────────────────────────────────────
router.get('/youtube-status', verifyJWT, getYouTubeStatus);
router.get('/yt/search', ytSearchProxy);
router.get('/yt/channel-stats', ytGetChannelStats);

// ── YouTube Proxy Endpoints (all require JWT auth) ────────────────────────────
router.post('/yt/like',      verifyJWT, ytLike);
router.get ('/yt/rating',    verifyJWT, ytGetRating);
router.get ('/yt/comments',  verifyJWT, ytGetComments);
router.post('/yt/comment',   verifyJWT, ytPostComment);
router.post('/yt/subscribe', verifyJWT, ytToggleSubscription);
router.get ('/yt/subscription',    verifyJWT, ytCheckSubscription);
router.get ('/yt/liked-videos',    verifyJWT, ytGetLikedVideos);
router.get ('/yt/subscriptions',   verifyJWT, ytGetSubscriptions);
router.get ('/yt/my-channel-stats', verifyJWT, ytGetMyChannelStats);
router.post('/yt/playlists', verifyJWT, ytCreatePlaylist);
router.post('/yt/playlists/:ytPlaylistId/items', verifyJWT, ytAddPlaylistItem);
router.delete('/yt/playlists/:ytPlaylistId/items/:itemId', verifyJWT, ytRemovePlaylistItem);

export default router;
