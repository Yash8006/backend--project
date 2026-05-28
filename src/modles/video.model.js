import mongoose from "mongoose";
import mongoosePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new mongoose.Schema({
    videofile:{
        type: String,
        required: true,
    },
    thumbnail:{
        type: String,
        required: true,
    },
    title:{
        type: String,
        required: true,
        trim: true,
    },
    description:{
        type: String,
        required: true,
        trim: true,
    },
    duration:{
        type: Number,
        required: true,
    },
    views:{
        type: Number,
        default: 0,
    },
    isPublished:{
        type: Boolean,
        default: true,
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
},{ timestamps: true });

videoSchema.plugin(mongoosePaginate);
export const Video = mongoose.model("Video", videoSchema);