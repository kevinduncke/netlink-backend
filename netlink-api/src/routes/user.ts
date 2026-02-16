import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getUserProfile, updateUserProfile } from "../controllers/user.controller";
import { getNotifications, markAsRead } from "../controllers/notification.controller";

const router = Router();

router.get("/test", authenticate, (req, res) => {
    res.json({
        authenticated: true,
        user: (req as any).user
    });
});

// USER PROFILE
router.get('/:id', getUserProfile);

// USER PROFILE UPDATE
router.patch('/me', authenticate, updateUserProfile);

// USER NOTIFICATIONS
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markAsRead);

export default router;