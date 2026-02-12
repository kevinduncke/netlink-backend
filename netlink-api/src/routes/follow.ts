import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

import { followUser, unfollowUser, getFollowers, getFollowing } from "../controllers/follow.controller";

const router = Router();

router.post('/:id', authenticate, followUser);
router.delete('/:id', authenticate, unfollowUser);

router.get('/:id/followers', authenticate, getFollowers);
router.get('/:id/following', authenticate, getFollowing);

export default router;