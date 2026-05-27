import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

async function resolveLikeTarget(id: string) {
    const post = await prisma.post.findUnique({
        where: { id },
        include: { author: true }
    });

    if (post) {
        return post;
    }

    const share = await prisma.share.findUnique({
        where: { id },
        include: {
            post: {
                include: { author: true }
            }
        }
    });

    return share?.post ?? null;
}

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

        const post = await resolveLikeTarget(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const like = await prisma.like.upsert({
            where: {
                userId_postId: {
                    userId: currentUserId,
                    postId: post.id,
                }
            },
            update: {},
            create: {
                userId: currentUserId,
                postId: post.id,
            }
        });

        // post.authorId !== currentUserId, to avoid self-notifications
        if (post.authorId !== currentUserId) {
            await prisma.notification.create({
                data: {
                    userId: post.authorId,
                    fromUserId: currentUserId,
                    type: 'LIKE',
                    postId: post.id,
                    likeId: like.id,
                    content: 'liked your post.',
                }
            });
        }

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

        const post = await resolveLikeTarget(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        await prisma.like.deleteMany({
            where: {
                userId,
                postId: post.id
            }
        });

        res.json({ success: true, message: 'Post Unliked Successfully.' });

    } catch (error) {
        next(error);
    }
}