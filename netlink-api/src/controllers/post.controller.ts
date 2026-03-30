import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export async function createPost(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            content,
            location,
            imageUrl,
            hideLikes,
            disableComments
        } = req.body;

        const specificFollowers = req.body.specificTo; // AN ARRAY OF USER IDS
        const visibility = req.body.visibility;

        // CHECH IF CONTENT IS PROVIDED
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required and cannot be empty.' });
        }

        if (location && typeof location !== 'string') {
            return res.status(400).json({ error: 'Location must be a string.' });
        }

        // CREATE POST IN DB
        const post = await prisma.post.create({
            data: {
                content,
                visibility,
                location: location || null,
                imageUrl: imageUrl || null,
                hideLikes,
                disableComments,
                author: {
                    connect: { id: (req as any).user.id }
                },

                // ONLY CONNECT IF VISIBILITY IS SPECIFIC TO
                ...(visibility === 'SPECIFIC' && {
                    specificTo: {
                        connect: specificFollowers.map((id: string) => ({ id }))
                    }
                })
            },
        });

        // RESPOND WITH CREATED POST
        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
}

export async function getMyPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                username: true,
                posts: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        content: true,
                        location: true,
                        imageUrl: true,
                        createdAt: true,

                        _count: {
                            select: {
                                comments: true,
                                likes: true,
                                // shares: true
                            }
                        }
                    }
                },
            }
        });

        if (!user) {
            return res.status(404).json({ error: `User not found: ${userId}` });
        }

        res.json({
            id: user.id,
            name: user.name,
            username: user.username,
            postsCount: user.posts.length,
            posts: user.posts.map(post => ({
                id: post.id,
                content: post.content,
                location: post.location,
                imageUrl: post.imageUrl,
                createdAt: post.createdAt,
                commentsCount: post._count.comments,
                likesCount: post._count.likes,
                // sharesCount: post._count.shares ?? 0
            }))
        });
    } catch (error) {
        next(error);
    }
}