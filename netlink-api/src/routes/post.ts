import { Router } from "express";
import { createPost } from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, createPost);

export default router;