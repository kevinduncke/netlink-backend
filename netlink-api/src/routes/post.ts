import { Router } from "express";
import {
    createPost,
    getMyPosts,
    updatePost,
    deletePost,
    getAllPosts,
    searchPosts,
    getUserPosts,
    getFollowingPosts,
    createRepost,
    deleteRepost,
    getPost,
    getShare
} from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";
import { likePost, unlikePost } from "../controllers/like.controller";
import { createComment, deleteComment, getAllPostComments, updateComment } from "../controllers/comment.controller";

const router = Router();

// POST ROUTES
router.get("/following", authenticate, getFollowingPosts);
router.get("/all", authenticate, getAllPosts);
router.get("/my-posts", authenticate, getMyPosts);
router.get("/user/:id", authenticate, getUserPosts);
router.get("/p/:id", authenticate, getPost);
router.get("/share/:id", authenticate, getShare);
router.get("/:id", authenticate, searchPosts);
router.post("/", authenticate, createPost);
router.put("/update/:id", authenticate, updatePost);
router.delete("/delete/:id", authenticate, deletePost);

// LIKE ROUTES
router.post("/like/:id", authenticate, likePost);
router.post("/unlike/:id", authenticate, unlikePost);

// COMMENT ROUTES
router.post("/comment/:id", authenticate, createComment);
router.get("/comments/all/:id", authenticate, getAllPostComments);
router.delete("/comment/:id", authenticate, deleteComment);
router.put("/comment/:id", authenticate, updateComment);

// REPOST ROUTES
router.post("/repost/:id", authenticate, createRepost);
router.delete("/repost/:id", authenticate, deleteRepost);

export default router;