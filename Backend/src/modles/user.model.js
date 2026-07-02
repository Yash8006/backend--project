import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true ,
        index: true,
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true,
    },
    fullName: {
        type: String, 
        required: true, 
        index: true,
        trim: true,
    },
    avatar:{
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
    },
    // Separate array for YouTube videos — they are external (no ObjectId ref)
    // Stored as embedded subdocuments to avoid a join
    youtubeWatchHistory: [{
        youtubeId:    { type: String, required: true },
        title:        { type: String, default: '' },
        thumbnail:    { type: String, default: '' },
        channelTitle: { type: String, default: '' },
        watchedAt:    { type: Date,   default: Date.now },
    }],
    password:{
        type: String,
        // Optional — Google OAuth users register without a password
    },
    refreshToken: {
        type: String,
    },
    // ── Google / YouTube OAuth ────────────────────────────────────────────
    googleId: {
        type:   String,
        unique: true,
        sparse: true, // index only applies when the field is set
    },
    authProvider: {
        type:    String,
        enum:    ['local', 'google'],
        default: 'local',
    },
    // YouTube access/refresh tokens for write-API (like, comment, subscribe)
    youtubeAccessToken:  { type: String },
    youtubeRefreshToken: { type: String },
    youtubeTokenExpiry:  { type: Date },




}, { timestamps: true });

userSchema.pre("save", async function(){
    // Only hash if password is present and has changed
    if(this.isModified("password") && this.password){
        this.password = await bcrypt.hash(this.password, 10);
    }
});
userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password);
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({ _id: this._id, email: this.email, username: this.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
}
export const User = mongoose.model("User", userSchema);