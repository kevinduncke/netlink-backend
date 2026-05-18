import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getMyProfile, getUserProfile, updateUserProfile, getListOfUsers, getSuggestedUsers, deleteMyAccount } from "../controllers/user.controller";
import { getNotifications, markAsRead } from "../controllers/notification.controller";

const router = Router();

router.get("/test", authenticate, (req, res) => {
    res.json({
        authenticated: true,
        user: (req as any).user
    });
});

// SUGGESTED USERS
router.get('/suggested', authenticate, getSuggestedUsers);

// SEARCH USERS
router.get('/search', authenticate, getListOfUsers);

// USER NOTIFICATIONS (must be before /:id to avoid being caught by parameter)
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markAsRead);

// USER PROFILE
router.get('/me', authenticate, getMyProfile);
router.patch('/me', authenticate, updateUserProfile);

// USER DELETE
router.delete('/me', authenticate, deleteMyAccount);

// USER PROFILE BY ID (catch-all, must be last)
router.get('/:id', authenticate, getUserProfile);

export default router;  