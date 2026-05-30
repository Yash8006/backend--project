import asyncHandler from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../modles/user.model.js";
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
const registerUser = asyncHandler(async (req, res) => {
    // get user data from frontend
    // validate user data - not empty
    // check if user already exists
    //check for images, check for avatar
    //upload images to cloudinary, avatar to cloudinary
    // create user object - create entry in database
    // remove password and refresh token field from the response
    // check if user created successfully, if not throw error
    // send response to frontend with success message and user data
    const { username, email, fullName, password } = req.body;
    if (fullName === "" || username === "" || email === "" || password === "") {
        throw new ApiError(400, "All fields are required")
    }
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existingUser) {
        throw new ApiError(409, "User already exists with this username or email")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path

    }
    const avatarUrl = await uploadToCloudinary(avatarLocalPath);
    const coverImageUrl = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath) : null;
    if (!avatarUrl) {
        throw new ApiError(500, "Failed to upload avatar to cloudinary")
    }
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatarUrl.url,
        coverImage: coverImageUrl?.url || null,
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Failed to create user")
    }
    return res.status(201).json(new ApiResponse(true, "User registered successfully", createdUser))

})
const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // validate data
    // check if user exists with the provided username or email
    // if user does not exist, throw error
    // if user exists, compare password
    // if password does not match, throw error
    // if password matches, generate access token and refresh token
    // save refresh token in database
    // send cookies
    const { username, email, password } = req.body;
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User not found with this username or email")
    }
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid user credentials")
    }
    const { accessToken, refreshToken } = await generateAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"))

})
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: undefined }, { new: true });
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res.status(201).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(true, "User logged out successfully"))

})
const refreshAccessToken = asyncHandler(async (req, res) => {
    try{
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
    const { accessToken, newrefreshToken } = await generateAndRefreshTokens(user._id);
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newrefreshToken, options).json(new ApiResponse(200, { accessToken, refreshToken: newrefreshToken }, "Access token refreshed successfully"))

    }catch(error){
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})
const changePassword = asyncHandler(async (req,res) =>{
    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(req.user?._id);
    const isOldPasswordCorrect = await user.comparePassword(oldPassword);
    if(!isOldPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect")
    } 
    user.password = newPassword;
    await user.save(validateBeforeSave = false);
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})
const getCurrentUser = asyncHandler(async (req,res) =>{
    return res.status(200).json(new ApiResponse(200, {user: req.user}, "Current user fetched successfully"))
})
const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullName, email} = req.body;
    if(!fullName || !email){
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
const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;
    
    if (!avatarLocalPath) {
        throw new ApiError(404, "Avatar image is required")
    }

    // Capture old avatar URL before updating the DB
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

    // Delete the old avatar from Cloudinary after successful update
    if (oldAvatarUrl) {
        await oldImageDeleted(oldAvatarUrl);
    }

    return res.status(200).json(new ApiResponse(200, { user }, "User avatar updated successfully"))
})
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;
     
    if (!coverImageLocalPath) {
        throw new ApiError(404, "Cover image is required")
    }

    // Capture old cover image URL before updating the DB
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

    // Delete the old cover image from Cloudinary after successful update
    if (oldCoverImageUrl) {
        await oldImageDeleted(oldCoverImageUrl);
    }

    return res.status(200).json(new ApiResponse(200, { user }, "User cover image updated successfully"))
})
const getUserChannelProfile = asyncHandler(async(req,res)=>{
const {username} = req.params;
if(!username?.trim()){
    throw new ApiError(400, "Username is required")
}
const channel = await User.aggregate([
    {
        $match:{
            username: username?.toLowerCase()
        }
    },
    {
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
    },
    {
        $lookup:{
            from: "subscriptions",
            localfield: "_id",
            foreignField: "subscriber",
            as: "subscribeToChannels"
        }
    },
    {
        $addFields: {
            subscribersCount:{$size: "$subscribers"},
            subscribedChannelsCount: {$size: "$subscribeToChannels"},
            isSubscribed:{
                $cond:{
                    if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                    then: true,
                    else: false

                }
            }
        }
    },
    {
        $project:{
            fullName: 1,
            username: 1,
            avatar: 1,
            coverImage: 1,
            subscribersCount: 1,
            subscribedChannelsCount: 1,
            isSubscribed: 1,
            email: 1,
        }
    }
])
if(!channel || channel.length === 0){
    throw new ApiError(404, "Channel not found with this username");
}
return res.status(200).json(new ApiResponse(200, {channel: channel[0]}, "Channel profile fetched successfully"))
})
export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile }