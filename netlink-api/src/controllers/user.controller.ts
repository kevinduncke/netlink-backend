import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user?.id;
        const userId = req.params.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

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
                privacyMode: true,
                createdAt: true,

                // FOLLOWERS COUNT
                followers: {
                    select: {
                        id: true,
                        followingId: true
                    }
                },

                // FOLLOWING COUNT
                following: {
                    select: {
                        id: true,
                        followerId: true
                    }
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
            privacyMode: user.privacyMode,
            followersCount: user.following.length,
            followingCount: user.followers.length,
            postsCount: user.posts.length,
            posts: user.posts,

            // FOLLOWERS
            following: user.followers.map(f => f.followingId),

            // FOLLOWING
            followers: user.following.map(f => f.followerId),
            isFollowedByMe: currentUserId ? user.following.some(f => f.followerId === currentUserId) : false,
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
                privacyMode: true,

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

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true,
                    }
                }
            }
        });

        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
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
            privacyMode: user.privacyMode,
            followers: followers.map(f => f.follower),
            followersCount: followers.length,
            following: following.map(f => f.following),
            followingCount: following.length,
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

export async function getListOfUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const query = req.query.query as string;

        const userId = (req as any).user!.id;

        if (!query || query.trim() === '') {
            // RETURN EMPTY ARRAY LIST IF NO QUERY PROVIDED
            return res.json([]);
        }

        const users = await prisma.user.findMany({
            where: {
                id: { not: userId },
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true
            },
            take: 5 // LIMIT TO 5 RESULTS
        });

        res.json(users);
    } catch (error) {
        next(error);
    }
}

export async function getSuggestedUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);

        const usersToFollow = await prisma.user.findMany({
            where: {
                id: {
                    notIn: [...followingIds, userId]
                }
            },
            select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true
            },
            take: 5
        });

        res.json(usersToFollow);
    } catch (error) {
        next(error);
    }
}

export async function changePrivacyMode(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user!.id;
        const { privacyMode } = req.body;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                privacyMode: {
                    set: privacyMode
                }
            }
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
}

export async function deleteMyAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid User ID.' });
        }

        // DELETE ACCOUNT IN CASCADE + ALL USER-RELATED DATA
        await prisma.user.delete({
            where: { id: currentUserId }
        });

        res.json({ message: 'Account deleted successfully.' });
    } catch (error) {
        next(error);
    }
}