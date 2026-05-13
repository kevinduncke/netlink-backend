import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

export async function likePost(req: Request, res: Response, next: NextFunction) {
    try {
        const postId = req.params.id;
        const currentUserId = (req as any).user!.id;

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const like = await prisma.like.upsert({
            where: {
                userId_postId: {
                    userId: currentUserId,
                    postId,
                }
            },
            update: {},
            create: {
                userId: currentUserId,
                postId,
            }
        });

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: { author: true }
        });

        const currentUserData = await prisma.user.findUnique({
            where: { id: currentUserId },
        });

        await prisma.notification.create({
            data: {
                userId: post!.authorId,
                fromUserId: currentUserId,
                type: 'LIKE',
                postId: postId,
                likeId: like.id,
                content: 'liked your post.',
            }
        });

        res.status(201).json(like);
    } catch (error) {
        next(error);
    }
};


export async function unlikePost(req: Request, res: Response, next: NextFunction) {
    try {
        const postId = req.params.id;
        const userId = (req as any).user!.id;

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        await prisma.like.deleteMany({
            where: {
                userId,
                postId
            }
        });

        res.json({ success: true, message: 'Post Unliked Successfully.' });

    } catch (error) {
        next(error);
    }
}