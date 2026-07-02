import { Router } from "express";
import { logoutUser, refreshAccessToken, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, addToYouTubeWatchHistory, getYouTubeWatchHistory, clearYouTubeWatchHistory, removeFromYouTubeWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import  {verifyJWT}  from "../middlewares/auth.middleware.js";
const router = Router();

// secured routes - require authentication
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refreshtoken").post(refreshAccessToken);
router.route("/user-info").get(verifyJWT, getCurrentUser);
router.route("/update-profile").patch(verifyJWT,updateAccountDetails);
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/update-cover").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/yt-watch-history")
    .get(verifyJWT, getYouTubeWatchHistory)
    .post(verifyJWT, addToYouTubeWatchHistory)
    .delete(verifyJWT, clearYouTubeWatchHistory);
router.route("/yt-watch-history/:youtubeId")
    .delete(verifyJWT, removeFromYouTubeWatchHistory);
export default router;