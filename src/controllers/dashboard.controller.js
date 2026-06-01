import mongoose from "mongoose";
import { Video } from "../modles/video.model.js";
import { Subscription } from "../modles/subscription.model.js";
import { Like } from "../modles/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    // 1. Total Subscribers
    const totalSubscribers = await Subscription.countDocuments({ channel: userId });

    // 2. Total Videos & Total Views
    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" }
            }
        }
    ]);

    // 3. Total Likes across all of the user's videos
    const totalLikes = await Like.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $match: {
                "videoDetails.owner": new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: 1 }
            }
        }
    ]);

    const stats = {
        totalSubscribers,
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: totalLikes[0]?.totalLikes || 0
    };

    return res.status(200).json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const videos = await Video.find({ owner: userId }).sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export {
    getChannelStats,
    getChannelVideos
}
