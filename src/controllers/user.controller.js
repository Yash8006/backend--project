import asyncHandler from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../modles/user.model.js";
import uploadToCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
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
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
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
export { registerUser }