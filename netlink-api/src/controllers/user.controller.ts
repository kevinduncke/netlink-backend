import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.params.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required in URL params.'
            });
        };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                username: true,
                bio: true,
                url: true,
                avatarUrl: true,
                createdAt: true,

                // FOLLOWERS COUNT
                followers: {
                    select: { id: true }
                },

                // FOLLOWING COUNT
                following: {
                    select: { id: true }
                },

                // POSTS
                posts: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        content: true,
                        imageUrl: true,
                        createdAt: true,
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            bio: user.bio,
            url: user.url,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            postsCount: user.posts.length,
            posts: user.posts
        });
    } catch (error) {
        next(`Error fetching user profile: ${error}`);
    }
}

export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user!.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                username: true,
                bio: true,
                url: true,
                avatarUrl: true,
                // FOLLOWERS COUNT
                followers: {
                    select: { id: true }
                },

                // FOLLOWING COUNT
                following: {
                    select: { id: true }
                },

                // POSTS
                posts: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        content: true,
                        imageUrl: true,
                        createdAt: true,
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: `User not found: ${userId}` });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            bio: user.bio,
            url: user.url,
            avatarUrl: user.avatarUrl,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            postsCount: user.posts.length,
            posts: user.posts
        });
    } catch (error) {
        next(`Error fetching user profile: ${error}`);
    }
}

export async function updateUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user!.id;
        const { name, username, bio, url, avatarUrl } = req.body;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                username,
                bio,
                url,
                avatarUrl
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
}