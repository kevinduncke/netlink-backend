import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

import { 
    followUser, 
    unfollowUser, 
    getFollowers, 
    getFollowing, 
    getAllFollowing, 
    getAllFollowers 
} from "../controllers/follow.controller";

const router = Router();

router.post('/:id', authenticate, followUser);
router.delete('/:id', authenticate, unfollowUser);

router.get('/followers', authenticate, getAllFollowers);
router.get('/:id/followers', authenticate, getFollowers);
router.get('/following', authenticate, getAllFollowing);
router.get('/:id/following', authenticate, getFollowing);

export default router;