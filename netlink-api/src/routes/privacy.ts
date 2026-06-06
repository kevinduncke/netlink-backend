import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
    reportUser
} from "../controllers/privacy.controller";

const router = Router();

router.post('/block/:id', authenticate, blockUser);
router.delete('/block/:id', authenticate, unblockUser);
router.post('/mute/:id', authenticate, muteUser);
router.delete('/mute/:id', authenticate, unmuteUser);
router.post('/report/:id', authenticate, reportUser);

export default router;