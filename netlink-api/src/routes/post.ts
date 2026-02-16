import { Router } from "express";
import { createPost } from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";
import { likePost, unlikePost } from "../controllers/like.controller";

const router = Router();

router.post("/", authenticate, createPost);
router.post("/like/:id", authenticate, likePost);
router.post("/unlike/:id", authenticate, unlikePost);

export default router;