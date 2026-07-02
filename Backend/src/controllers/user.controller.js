import mongoose from "mongoose"; // Added missing import
import asyncHandler from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../modles/user.model.js"; // Note: Check if "modles" is a typo in your folder structure, usually it's "models"
import uploadToCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import oldImageDeleted from "../utils/oldImageDeleted.js";

const generateAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken }
    } catch (error) {
        console.error("Actual token generation error:", error);
        throw new ApiError(500, "Failed to generate tokens")
    }
}



const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: undefined }, { new: true });
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res.status(200) // Changed from 201 to 200 (OK) for logout
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(true, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!incomingRefreshToken) {
            throw new ApiError(400, "Refresh token is required")
        }
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token does not match")
        }
        const options = {
            httpOnly: true,
            secure: true,
        }
        // Fixed destructuring syntax
        const { accessToken, refreshToken: newrefreshToken } = await generateAndRefreshTokens(user._id);

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newrefreshToken }, "Access token refreshed successfully"))

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})



const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, { user: req.user }, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "Full name and email are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password");
    return res.status(200).json(new ApiResponse(200, { user }, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(404, "Avatar image is required")
    }

    const oldAvatarUrl = req.user?.avatar;
    const avatarUrl = await uploadToCloudinary(avatarLocalPath);

    if (!avatarUrl) {
        throw new ApiError(500, "Failed to upload avatar to cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatarUrl.url
            }
        },
        { new: true }
    ).select("-password");

    if (oldAvatarUrl) {
        await oldImageDeleted(oldAvatarUrl);
    }

    return res.status(200).json(new ApiResponse(200, { user }, "User avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(404, "Cover image is required")
    }

    const oldCoverImageUrl = req.user?.coverImage;
    const coverImageUrl = await uploadToCloudinary(coverImageLocalPath);

    if (!coverImageUrl) {
        throw new ApiError(500, "Failed to upload cover image to cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImageUrl.url
            }
        },
        { new: true }
    ).select("-password");

    if (oldCoverImageUrl) {
        await oldImageDeleted(oldCoverImageUrl);
    }

    return res.status(200).json(new ApiResponse(200, { user }, "User cover image updated successfully"))
})



const addToYouTubeWatchHistory = asyncHandler(async (req, res) => {
    const { youtubeId, title, thumbnail, channelTitle } = req.body;

    if (!youtubeId) {
        throw new ApiError(400, "YouTube video ID is required");
    }

    // Remove any existing entry for this video first,
    // so re-watching moves it to the top (most recent) — same as YouTube behaviour
    await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { youtubeWatchHistory: { youtubeId } } }
    );

    // Push the fresh entry (most recent = last item)
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $push: {
                youtubeWatchHistory: {
                    youtubeId,
                    title: title || '',
                    thumbnail: thumbnail || '',
                    channelTitle: channelTitle || '',
                    watchedAt: new Date(),
                }
            }
        }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "Added to YouTube watch history")
    );
});

const getYouTubeWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("youtubeWatchHistory");
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    // Return in reverse order so most-recently watched is first
    const history = [...(user.youtubeWatchHistory || [])].reverse();
    return res.status(200).json(
        new ApiResponse(200, history, "YouTube watch history fetched successfully")
    );
});

const clearYouTubeWatchHistory = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { youtubeWatchHistory: [] } }
    );
    return res.status(200).json(
        new ApiResponse(200, {}, "YouTube watch history cleared")
    );
});

const removeFromYouTubeWatchHistory = asyncHandler(async (req, res) => {
    const { youtubeId } = req.params;

    if (!youtubeId) {
        throw new ApiError(400, "YouTube video ID is required");
    }

    await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { youtubeWatchHistory: { youtubeId } } }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "Removed from YouTube watch history")
    );
});

export { 
    logoutUser, 
    refreshAccessToken, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    addToYouTubeWatchHistory, 
    getYouTubeWatchHistory, 
    clearYouTubeWatchHistory,
    removeFromYouTubeWatchHistory
}