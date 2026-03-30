import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getMyProfile, getUserProfile, updateUserProfile, getListOfUsers } from "../controllers/user.controller";
import { getNotifications, markAsRead } from "../controllers/notification.controller";

const router = Router();

router.get("/test", authenticate, (req, res) => {
    res.json({
        authenticated: true,
        user: (req as any).user
    });
});

// SEARCH USERS
router.get('/search', authenticate, getListOfUsers);

// USER PROFILE
router.get('/me', authenticate, getMyProfile);
router.get('/:id', getUserProfile);

// USER PROFILE UPDATE
router.patch('/me', authenticate, updateUserProfile);

// USER NOTIFICATIONS
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markAsRead);

export default router;