import mongoose from "mongoose";

/**
 * Playlist model — stores YouTube video metadata directly so playlists
 * work with YouTube videos (not just internally-uploaded videos).
 * Optionally synced to YouTube if the user has a connected Google account.
 */
const playlistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    // YouTube video metadata stored directly (no internal Video ObjectId needed)
    videos: [
        {
            youtubeId:    { type: String, required: true },
            title:        { type: String, default: '' },
            thumbnail:    { type: String, default: '' },
            channelTitle: { type: String, default: '' },
            channelId:    { type: String, default: '' },
            addedAt:      { type: Date,   default: Date.now },
        }
    ],
    // Set when the playlist is successfully synced to the user's YouTube account
    youtubePlaylistId: {
        type: String,
        default: null,
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

export const Playlist = mongoose.model("Playlist", playlistSchema);
