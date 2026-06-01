import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { publishVideo, getAllVideos, getVideoById, updateVideo, deleteVideo } from "../controllers/videos.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getAllVideos);

router.route("/publish-video").post(verifyJWT, upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
]), publishVideo);

router.route("/:videoId")
    .get(getVideoById)
    .patch(verifyJWT, updateVideo)
    .delete(verifyJWT, deleteVideo);

export default router;
