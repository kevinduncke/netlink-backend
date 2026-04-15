import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

import {
    getFavoriteUsers,
    addFavoriteUser,
    getSuggestedFavoriteUsers,
    removeFavoriteUser,
    removeAllFavoritesUsers,
    searchFavoriteUsers,
    getFavoriteUsersPosts
} from "../controllers/favorite.controller";

const router = Router();

router.post('/:id', authenticate, addFavoriteUser);
router.delete('/all', authenticate, removeAllFavoritesUsers);
router.delete('/:id', authenticate, removeFavoriteUser);
router.get('/', authenticate, getFavoriteUsers);
router.get('/suggested', authenticate, getSuggestedFavoriteUsers);
router.get('/search', authenticate, searchFavoriteUsers);
router.get('/posts', authenticate, getFavoriteUsersPosts)

export default router;