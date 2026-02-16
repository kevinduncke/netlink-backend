import { Router } from "express";
import { getGlobalPosts } from "../controllers/globalposts.controller";
import { authenticate } from "../middleware/auth.middleware";
import { getFeedPosts } from "../controllers/feed.controller";

const router = Router();

router.get("/", getGlobalPosts);
router.get("/followings", authenticate, getFeedPosts);

export default router;