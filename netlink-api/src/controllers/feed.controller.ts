import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export async function getFeedPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user?.id;

        const followingUserId = await prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true },
        });

        const followingIds = followingUserId.map(f => f.followingId);

        if(followingIds.length === 0){
            return res.json([]); // No following users
        };

        const posts = await prisma.post.findMany({
            where: { authorId: { in: followingIds } },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        res.json(posts);
    } catch (error) {
        next(error);
    }
}