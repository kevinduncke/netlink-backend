import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

async function resolveCommentTarget(id: string) {
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

export async function createComment(req: Request, res: Response, next: NextFunction) {
    try {
        const { content } = req.body;
        const postId = req.params.id;
        const authorId = (req as any).user!.id;

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        if (!authorId || typeof authorId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'Comment cannot be empty.' });
        }

        if (content.length > 500) {
            return res.status(400).json({ error: 'Comment cannot exceed 500 characters.' });
        }

        const post = await resolveCommentTarget(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                postId: post.id,
                authorId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            }
        });

        await prisma.notification.create({
            data: {
                userId: (await prisma.post.findUnique({ where: { id: post.id } }))!.authorId,
                fromUserId: authorId,
                type: 'COMMENT',
                postId: post.id,
                commentId: comment.id,
                content: 'commented on your post.'
            }
        })

        res.status(201).json({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            author: comment.author
        });
    } catch (error) {
        next(error);
    }
}

export async function getAllPostComments(req: Request, res: Response, next: NextFunction) {
    try {
        const postId = req.params.id;
        const currentUserId = (req as any).user!.id;

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        const blocked = await prisma.block.findMany({
            where: {
                OR: [
                    { userId: currentUserId },
                    { blockedId: currentUserId }
                ]
            },
            select: {
                blockedId: true,
                userId: true
            }
        });

        let blockedIds = blocked.map(b => b.blockedId);
        blockedIds.push(...blocked.map(b => b.userId));

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true }
        });

        const repost = post
            ? null
            : await prisma.share.findUnique({
                where: { id: postId },
                select: {
                    id: true,
                    postId: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            avatarUrl: true
                        }
                    }
                }
            });

        const resolvedPostId = post?.id ?? repost?.postId ?? postId;

        const blockedComments = blockedIds.filter(id => id !== currentUserId);

        const comments = await prisma.comment.findMany({
            where: {
                postId: resolvedPostId,
                authorId: { notIn: blockedComments }
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const mapped = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            postId: comment.postId,
            author: comment.author
        }));

        res.json({
            comments: mapped
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
        const commentId = req.params.id;
        const userId = (req as any).user!.id;

        if (!commentId || typeof commentId !== 'string') {
            return res.status(400).json({ error: 'Invalid comment ID.' });
        }

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }

        if (comment.authorId !== userId) {
            return res.status(403).json({ error: 'You are not the owner of this comment.' });
        }

        await prisma.comment.delete({
            where: { id: commentId }
        });

        res.json({ message: 'Comment deleted successfully.' });
    } catch (error) {
        next(error);
    }
}

export async function updateComment(req: Request, res: Response, next: NextFunction) {
    try {
        // CONTENT AND TIME MODIFYED
        const { content, createdAt } = req.body;
        const commentId = req.params.id;
        const userId = (req as any).user!.id;

        if (!commentId || typeof commentId !== 'string') {
            return res.status(400).json({ error: 'Invalid comment ID.' });
        }

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'Comment cannot be empty.' });
        }

        if (content.length > 500) {
            return res.status(400).json({ error: 'Comment cannot exceed 500 characters.' });
        }

        const parsedCreatedAt = new Date(createdAt);
        if (!createdAt || Number.isNaN(parsedCreatedAt.getTime())) {
            return res.status(400).json({ error: 'Invalid createdAt value.' });
        }

        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }

        if (comment.authorId !== userId) {
            return res.status(403).json({ error: 'You are not the owner of this comment.' });
        }

        await prisma.comment.update({
            where: { id: commentId },
            data: {
                content: content.trim(),
                createdAt: parsedCreatedAt
            }
        });

        res.json({ message: 'Comment updated successfully.' });
    } catch (error) {
        next(error);
    }
}