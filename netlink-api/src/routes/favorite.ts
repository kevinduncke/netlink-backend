import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

import {
    getFavoriteUsers,
    addFavoriteUser,
    getSuggestedFavoriteUsers,
} from "../controllers/favorite.controller";

const router = Router();

router.get('/', authenticate, getFavoriteUsers);
router.get('/suggested', authenticate, getSuggestedFavoriteUsers);
router.post('/', authenticate, addFavoriteUser);

export default router;