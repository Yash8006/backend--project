import mongoose from "mongoose";
import { Like } from "../modles/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const userId = req.user?._id;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, {}, "Video unliked successfully"));
    } else {
        const newLike = await Like.create({ video: videoId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, newLike, "Video liked successfully"));
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const userId = req.user?._id;

    if (!commentId) {
        throw new ApiError(400, "Comment ID is required");
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, {}, "Comment unliked successfully"));
    } else {
        const newLike = await Like.create({ comment: commentId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, newLike, "Comment liked successfully"));
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const userId = req.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, {}, "Tweet unliked successfully"));
    } else {
        const newLike = await Like.create({ tweet: tweetId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, newLike, "Tweet liked successfully"));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $project: {
                videoDetails: {
                    title: 1,
                    description: 1,
                    thumbnail: 1,
                    views: 1,
                    owner: 1
                }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
