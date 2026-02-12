import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export async function createPost(req: Request, res: Response, next: NextFunction) {
    try {
        const { content, imageUrl } = req.body;

        // CHECH IF CONTENT IS PROVIDED
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required and cannot be empty.' });
        }

        // CREATE POST IN DB
        const post = await prisma.post.create({
            data: {
                content,
                imageUrl: imageUrl || null,
                authorId: (req as any).user.id,
            },
        });

        // RESPOND WITH CREATED POST
        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
}