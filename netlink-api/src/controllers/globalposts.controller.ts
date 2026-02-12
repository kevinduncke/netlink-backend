import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export async function getGlobalPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const posts = await prisma.post.findMany({
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