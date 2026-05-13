import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';

// FOLLOW A USER
export async function followUser(req: Request, res: Response, next: NextFunction) {
    try {
        const targetUserId = req.params.id;
        const currentUserId = (req as any).user!.id;

        if (targetUserId === currentUserId) {
            return res.status(400).json({ error: 'You cannot follow yourself!!.' });
        }

        if (!targetUserId || typeof targetUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid target user ID is req in URL params.'
            });
        }

        // CHECK IF ALREADY FOLLOWING
        const existFollow = await prisma.follow.findFirst({
            where: {
                followerId: currentUserId,
                followingId: targetUserId,
            },
        });

        if (existFollow) {
            return res.status(400).json({ error: 'Already following this user.' });
        }

        const follow = await prisma.follow.create({
            data: {
                followerId: currentUserId,
                followingId: targetUserId,
            },
        });

        await prisma.notification.create({
            data: {
                userId: targetUserId,
                fromUserId: currentUserId,
                type: 'FOLLOW',
                followId: follow.id,
                content: 'started following you.',
            }
        });

        res.status(201).json(follow);
    } catch (error) {
        next(error);
    }
}

// UNFOLLOW A USER
export async function unfollowUser(req: Request, res: Response, next: NextFunction) {
    try {
        const targetUserId = req.params.id;
        const currentUserId = (req as any).user!.id;

        if (!targetUserId || typeof targetUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid target user ID is req in URL params.'
            });
        }

        await prisma.follow.deleteMany({
            where: {
                followerId: currentUserId,
                followingId: targetUserId,
            }
        });

        res.json({ message: 'Unfollowed Successfully.', success: true });
    } catch (error) {
        next(error);
    }
}

// GET SPECIFIC FOLLOWERS USER
export async function getFollowers(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.params.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }

        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                    }
                }
            }
        });

        res.json(followers.map(f => f.follower));
    } catch (error) {
        next(error);
    }
}

// GET SPECIFIC FOLLOWING USER
export async function getFollowing(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.params.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Valid user ID is required in URL params.' });
        }

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        res.json(following.map(f => f.following));
    } catch (error) {
        next(error);
    }
}

// GET ALL FOLLOWING USERS
export async function getAllFollowing(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user!.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.json(following.map(f => f.following));
    } catch (error) {
        next(error);
    }
}

// GET ALL FOLLOWERS USERS (DATA) + WHO FROM THIS USERS I DON'T FOLLOW BACK
export async function getAllFollowers(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        // Get users that the current user is following
        const following = await prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true }
        });

        const followingIds = new Set(following.map(f => f.followingId));

        // Get followers of the current user
        const followers = await prisma.follow.findMany({
            where: { followingId: currentUserId },
            select: {
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

        const mapped = followers.map(f => ({
            ...f.follower,
            isFollowedByMe: followingIds.has(f.follower.id)
        }));

        res.json(mapped);
    } catch (error) {
        next(error);
    }
}