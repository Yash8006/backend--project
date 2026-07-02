import mongoose from "mongoose";
import { Playlist }    from "../modles/playlist.model.js";
import { User }        from "../modles/user.model.js";
import { ApiError }    from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler    from "../utils/asynchandler.js";

// ─── Helper: get a valid YouTube OAuth token (refreshes if expired) ───────────
async function getYTToken(userId) {
    const user = await User.findById(userId);
    if (!user?.youtubeAccessToken) return null; // not connected — graceful

    const isExpired = user.youtubeTokenExpiry && new Date() >= new Date(user.youtubeTokenExpiry);
    if (!isExpired) return user.youtubeAccessToken;

    // Refresh
    try {
        const params = new URLSearchParams({
            client_id:     process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: user.youtubeRefreshToken,
            grant_type:    'refresh_token',
        });
        const res  = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:   params.toString(),
        });
        const data = await res.json();
        if (!res.ok || !data.access_token) return null;

        user.youtubeAccessToken = data.access_token;
        user.youtubeTokenExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);
        await user.save({ validateBeforeSave: false });
        return data.access_token;
    } catch {
        return null;
    }
}

// ─── Helper: create a playlist on YouTube ────────────────────────────────────
async function createYTPlaylist(token, { name, description, isPublic }) {
    try {
        const res = await fetch(
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
        const data = await res.json();
        return res.ok ? data.id : null;
    } catch {
        return null;
    }
}

// ─── Helper: insert a video into a YouTube playlist ───────────────────────────
async function addToYTPlaylist(token, ytPlaylistId, youtubeId) {
    try {
        const res = await fetch(
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
        const data = await res.json();
        return res.ok ? data.id : null; // returns the playlistItem ID for later removal
    } catch {
        return null;
    }
}

// ─── Helper: delete a YouTube playlist ───────────────────────────────────────
async function deleteYTPlaylist(token, ytPlaylistId) {
    try {
        await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?id=${encodeURIComponent(ytPlaylistId)}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        );
    } catch { /* graceful */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CRUD Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/playlists
 * Body: { name, description?, isPublic? }
 * Creates the playlist in MongoDB, then optionally syncs to YouTube.
 */
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description = '', isPublic = false } = req.body;
    if (!name?.trim()) throw new ApiError(400, "Playlist name is required");

    // Create in MongoDB first
    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        isPublic,
        owner:  req.user._id,
        videos: [],
    });

    // Optionally sync to YouTube (graceful — failure doesn't block response)
    let ytSynced = false;
    const token = await getYTToken(req.user._id);
    if (token) {
        const ytId = await createYTPlaylist(token, { name: name.trim(), description, isPublic });
        if (ytId) {
            playlist.youtubePlaylistId = ytId;
            await playlist.save();
            ytSynced = true;
        }
    }

    return res.status(201).json(new ApiResponse(201, { ...playlist.toObject(), ytSynced }, "Playlist created successfully"));
});

/**
 * GET /api/v1/playlists/user/:userId
 * Returns all playlists owned by the user with video count.
 */
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId) throw new ApiError(400, "User ID is required");

    const playlists = await Playlist.find({ owner: new mongoose.Types.ObjectId(userId) })
        .select('name description videos youtubePlaylistId isPublic createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .lean();

    // Add totalVideos and cover thumbnail to each playlist
    const enriched = playlists.map(p => ({
        ...p,
        totalVideos:    p.videos.length,
        coverThumbnail: p.videos[0]?.thumbnail || null,
        videos:         p.videos, // keep full list for detail page
    }));

    return res.status(200).json(new ApiResponse(200, enriched, "Playlists fetched successfully"));
});

/**
 * GET /api/v1/playlists/:playlistId
 */
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId) throw new ApiError(400, "Playlist ID is required");

    const playlist = await Playlist.findById(playlistId).lean();
    if (!playlist) throw new ApiError(404, "Playlist not found");

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

/**
 * PATCH /api/v1/playlists/add/:videoId/:playlistId
 * Body: { title, thumbnail, channelTitle, channelId }
 * videoId here is the YouTube video ID (string).
 */
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId: youtubeId } = req.params;
    const { title = '', thumbnail = '', channelTitle = '', channelId = '' } = req.body;

    if (!playlistId || !youtubeId) throw new ApiError(400, "Playlist ID and YouTube video ID are required");

    const playlist = await Playlist.findOne({ _id: playlistId, owner: req.user._id });
    if (!playlist) throw new ApiError(404, "Playlist not found or you don't own it");

    // Prevent duplicates
    const alreadyAdded = playlist.videos.some(v => v.youtubeId === youtubeId);
    if (alreadyAdded) {
        return res.status(200).json(new ApiResponse(200, playlist, "Video already in playlist"));
    }

    playlist.videos.push({ youtubeId, title, thumbnail, channelTitle, channelId, addedAt: new Date() });

    // Optionally sync to YouTube
    let ytItemId = null;
    if (playlist.youtubePlaylistId) {
        const token = await getYTToken(req.user._id);
        if (token) {
            ytItemId = await addToYTPlaylist(token, playlist.youtubePlaylistId, youtubeId);
        }
    }

    await playlist.save();
    return res.status(200).json(new ApiResponse(200, { playlist, ytItemId }, "Video added to playlist"));
});

/**
 * PATCH /api/v1/playlists/remove/:videoId/:playlistId
 * videoId is the YouTube video ID.
 */
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId: youtubeId } = req.params;
    if (!playlistId || !youtubeId) throw new ApiError(400, "Playlist ID and YouTube video ID are required");

    const playlist = await Playlist.findOne({ _id: playlistId, owner: req.user._id });
    if (!playlist) throw new ApiError(404, "Playlist not found");

    playlist.videos = playlist.videos.filter(v => v.youtubeId !== youtubeId);
    await playlist.save();

    return res.status(200).json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

/**
 * DELETE /api/v1/playlists/:playlistId
 */
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const playlist = await Playlist.findOneAndDelete({ _id: playlistId, owner: req.user._id });
    if (!playlist) throw new ApiError(404, "Playlist not found");

    // Optionally delete from YouTube
    if (playlist.youtubePlaylistId) {
        const token = await getYTToken(req.user._id);
        if (token) await deleteYTPlaylist(token, playlist.youtubePlaylistId);
    }

    return res.status(200).json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

/**
 * PATCH /api/v1/playlists/:playlistId
 * Body: { name?, description?, isPublic? }
 */
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description, isPublic } = req.body;

    const update = {};
    if (name?.trim())            update.name        = name.trim();
    if (description !== undefined) update.description = description;
    if (isPublic    !== undefined) update.isPublic    = isPublic;

    const playlist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: req.user._id },
        { $set: update },
        { new: true }
    );
    if (!playlist) throw new ApiError(404, "Playlist not found");

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
