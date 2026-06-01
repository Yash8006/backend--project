import mongoose from "mongoose";
import { Video } from "../modles/video.model.js";
import asyncHandler from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import uploadToCloudinary from "../utils/cloudinary.js";


const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description) {
        throw new ApiError(400, "Title and Description are required")
    }
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail image is required")
    }

    const videoUploadResult = await uploadToCloudinary(videoLocalPath)
    const thumbnailUploadResult = await uploadToCloudinary(thumbnailLocalPath)

    if (!videoUploadResult) {
        throw new ApiError(500, "Error uploading video to Cloudinary")
    }
    if (!thumbnailUploadResult) {
        throw new ApiError(500, "Error uploading thumbnail to Cloudinary")
    }
    const video = await Video.create({
        title,
        description,
        videofile: videoUploadResult?.url,
        thumbnail: thumbnailUploadResult?.url,
        duration: videoUploadResult?.duration,
        owner: req.user?._id,
        isPublished: true
    });
    return res.status(201).json(new ApiResponse(201, video, "Video published successfully"))


})
const getAllVideos = asyncHandler(async(req, res)=>{
    const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;

    const pipeline = [];

    // 1. Searching
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } }
                ]
            }
        });
    }

    // 2. Filter by Specific User
    if (userId) {
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // 3. Always filter to only show published videos
    pipeline.push({
        $match: {
            isPublished: true
        }
    });

    // 4. Sorting
    const sortDirection = sortType === "desc" ? -1 : 1;
    pipeline.push({
        $sort: {
            [sortBy]: sortDirection
        }
    });

    // 5. Pagination Options
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    // 6. Execute
    const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), options);

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true }
    );

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $set: { title, description } },
        { new: true }
    );

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export { publishVideo, getAllVideos, getVideoById, updateVideo, deleteVideo }