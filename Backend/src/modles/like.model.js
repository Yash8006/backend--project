import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    },
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tweet" // Even if Tweet model isn't built yet, setting this up early is a best practice!
    },
    likedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {timestamps: true});

export const Like = mongoose.model("Like", likeSchema);
