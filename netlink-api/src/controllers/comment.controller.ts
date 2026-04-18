import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

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

        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                postId,
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

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        const comments = await prisma.comment.findMany({
            where: { postId },
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
            orderBy: { createdAt: 'asc' }
        });

        const mapped = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            postId: comment.postId,
            author: comment.author
        }));

        res.json({ comments: mapped });
    } catch (error) {
        next(error);
    }
}