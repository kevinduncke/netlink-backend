import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

export async function getFavoriteUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }
        
        const favorites = await prisma.favorite.findMany({
            where: { userId: currentUserId },
            include: {
                favorite: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            }
        });

        const mappedFavorites = favorites.map(f => f.favorite);

        res.json({
            count: mappedFavorites.length,
            users: mappedFavorites
        });
    } catch (error) {
        next(error);
    }
}

export async function getSuggestedFavoriteUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }
        
        const favorites = await prisma.favorite.findMany({
            where: { userId: currentUserId },
            select: { favoriteId: true }
        });

        // GET SUGGESTED USERS WHERE NOT IN FAVORITES OR IT'S THE CURRENT USER
        const excludedIds = [...favorites.map(f => f.favoriteId), currentUserId];

        const suggestedUsers = await prisma.user.findMany({
            where: {
                id: {
                    notIn: excludedIds
                }
            },
            select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true
            }
        });

        // RANDOMIZE SUGGESTED USERS
        for (let i = suggestedUsers.length - 1; i > 0; i--) {
            const x = Math.floor(Math.random() * (i + 1));
            const temp = suggestedUsers[i];
            suggestedUsers[i] = suggestedUsers[x]!;
            suggestedUsers[x] = temp!;
        }

        const limitedSuggestions = 5;
        const randomizeSuggestions = suggestedUsers.slice(0, limitedSuggestions);

        res.json({
            count: randomizeSuggestions.length,
            users: randomizeSuggestions
        });
    } catch (error) {
        next(error);
    }
}

export async function addFavoriteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const targetFavoriteUserId = req.body.favoriteUserId;
        const currentUserId = (req as any).user!.id;

        // VALIDATE TARGET USER ID
        if (!targetFavoriteUserId || typeof targetFavoriteUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid target user ID is required.'
            });
        }

        // CHECK IF ALREADY FAVORITED
        const existFavorite = await prisma.favorite.findFirst({
            where: {
                favoriteId: targetFavoriteUserId,
                userId: currentUserId
            },
        });

        if (existFavorite) {
            return res.status(400).json({ error: 'Already favorited this user.' });
        }

        const favorite = await prisma.favorite.create({
            data: {
                favoriteId: targetFavoriteUserId,
                userId: currentUserId,
            },
        });

        res.status(201).json(favorite);
    } catch (error) {
        next(error);
    }
}