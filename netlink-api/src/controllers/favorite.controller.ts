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
        const targetFavoriteUserId = req.params.id;
        const currentUserId = (req as any).user!.id;

        // VALIDATE TARGET USER ID
        if (!targetFavoriteUserId || typeof targetFavoriteUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid target user ID is required.'
            });
        }

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
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

export async function removeFavoriteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const targetFavoriteUserId = req.params.id;
        const currentUserId = (req as any).user!.id;

        // VALIDATE TARGET USER ID
        if (!targetFavoriteUserId || typeof targetFavoriteUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid target user ID is required.'
            });
        }

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }

        const favorite = await prisma.favorite.findFirst({
            where: {
                userId: currentUserId,
                favoriteId: targetFavoriteUserId
            }
        });

        if (!favorite) {
            return res.status(404).json({ error: 'Favorite user not found.' });
        }

        await prisma.favorite.delete({
            where: { id: favorite.id }
        });

        res.json({
            message: 'User removed from favorites.',
            removedUserId: targetFavoriteUserId
        });
    } catch (error) {
        next(error);
    }
}

export async function removeAllFavoritesUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }

        await prisma.favorite.deleteMany({
            where: { userId: currentUserId }
        });

        res.json({ message: 'All favorite users removed successfully.' });
    } catch (error) {
        next(error);
    }
}

export async function searchFavoriteUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;
        const query = String(req.query.q || '').trim();

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }

        if (!query) {
            return res.status(400).json({ error: 'Search query is required.' });
        }

        const favorites = await prisma.favorite.findMany({
            where: { userId: currentUserId },
            select: { favoriteId: true }
        });

        const favoriteIds = favorites.map(f => f.favoriteId);

        const users = await prisma.user.findMany({
            where: {
                id: { not: currentUserId },
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true
            }
        });

        const mapped = users.map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl,
            isFavorite: favoriteIds.includes(user.id)
        }));

        res.json({
            count: mapped.length,
            users: mapped
        });
    } catch (error) {
        next(error);
    }
}

export async function getFavoriteUsersPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }

        // GET ONLY THREE FAVORITE USERS
        const favorites = await prisma.favorite.findMany({
            where: { userId: currentUserId },
            select: { favoriteId: true },
            take: 3
        });

        const favoriteIds = favorites.map(f => f.favoriteId);

        // GET POSTS FROM FAVORITE USERS
        const posts = await prisma.post.findMany({
            where: {
                authorId: { in: favoriteIds }
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                content: true,
                location: true,
                createdAt: true,
                hideLikes: true,
                disableComments: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        likes: true,
                        sharedPosts: true
                    }
                }
            }
        });

        const mapped = posts.map(post => ({
            id: post.id,
            content: post.content,
            location: post.location,
            createdAt: post.createdAt,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                sharedPosts: post._count.sharedPosts
            }
        }));

        res.json({
            count: mapped.length,
            posts: mapped
        });
    } catch (error) {
        next(error);
    }
}