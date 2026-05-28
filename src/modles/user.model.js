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
    watchHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
    }],
    password:{
        type: String,
        required: [ true, "Password is required" ],

    }, 
    refreshToken: {
        type: String,
    },




}, { timestamps: true });

userSchema.pre("save", async function(next){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password, this.password);
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({ _id: this._id, email: this.email, username: this.username }, process.env.JWT_SECRET, { expiresIn: "1d" });
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: "10d" });
}
export const User = mongoose.model("User", userSchema);