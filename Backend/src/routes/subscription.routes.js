import { Router } from "express";
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// This is a cool trick! By using router.use() here, 
// every single route below it will require the user to be logged in.
router.use(verifyJWT); 

router.route("/c/:channelId")
    .post(toggleSubscription)
    .get(getUserChannelSubscribers);

router.route("/u/:subscriberId")
    .get(getSubscribedChannels);

export default router;
