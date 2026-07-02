import mongoose from "mongoose";
import { Subscription } from "../modles/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user?._id;

    if (!channelId) {
        throw new ApiError(400, "Channel ID is required");
    }

    // 1. Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    });

    // 2. Toggle Logic
    if (existingSubscription) {
        // They are already subscribed, so we DELETE the record (Unsubscribe)
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed successfully"));
    } else {
        // They aren't subscribed, so we CREATE a new record (Subscribe)
        const newSubscription = await Subscription.create({
            subscriber: subscriberId,
            channel: channelId
        });
        return res.status(200).json(new ApiResponse(200, newSubscription, "Subscribed successfully"));
    }
});

// Get a list of all users who subscribed to a specific channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "Channel ID is required");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $project: {
                subscriberDetails: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"));
});

// Get a list of all channels that a specific user has subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!subscriberId) {
        throw new ApiError(400, "Subscriber ID is required");
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },
        {
            $project: {
                channelDetails: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
