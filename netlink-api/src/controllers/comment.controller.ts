import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

export async function createComment(req: Request, res: Response, next: NextFunction) {
    try {
        const { content } = req.body;
        const postId = req.params.postId;
        const authorId = (req as any).user!.id;

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({ error: 'Invalid post ID.' });
        }

        if (!authorId || typeof authorId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                postId,
                authorId
            }
        });

        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
}