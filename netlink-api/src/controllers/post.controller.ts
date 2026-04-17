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
                        hideLikes: true,
                        disableComments: true,
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
                hideLikes: post.hideLikes,
                disableCommentes: post.disableComments,                 
                commentsCount: post._count.comments,
                likesCount: post._count.likes,
                // sharesCount: post._count.shares
            }))
        });
    } catch (error) {
        next(error);
    }
}

export async function getAllPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(401).json({
                error: 'Unauthorized.'
            });
        };

        const posts = await prisma.post.findMany({
            where: {
                visibility: 'PUBLIC'
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                content: true,
                createdAt: true,
                isShared: true,
                hideLikes: true,
                disableComments: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true,
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        likes: true,
                        sharedPosts: true
                    }
                }
            }
        });

        const mapped = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            isShared: post.isShared,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.sharedPosts
            }
        }));

        res.json({
            postsCount: mapped.length,
            posts: mapped
        });
    } catch (error) {
        next(error);
    }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user.id;
        const postId = req.params.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({
                error: 'Valid post ID is required.'
            });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post || post.authorId !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this post.' });
        }

        await prisma.post.delete({
            where: { id: postId }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

export async function updatePost(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user.id;
        const postId = req.params.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({
                error: 'Valid post ID is required.'
            });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post || post.authorId !== userId) {
            return res.status(403).json({ error: 'Not authorized to update this post.' });
        }

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                content: req.body.content
            },
        });

        // RESPOND WITH UPDATED STATUS CODE
        res.json({ success: true, post: updatedPost });
    } catch (error) {
        next(error);
    }
}

export async function searchPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user.id;

        const parseDateParam = (value: unknown, endOfDay = false): Date | null => {
            if (typeof value !== 'string' || value.trim().length === 0) {
                return null;
            }

            const raw = value.trim();
            const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
                ? `${raw}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
                : raw;

            const parsed = new Date(iso);
            if (Number.isNaN(parsed.getTime())) {
                return null;
            }

            return parsed;
        };

        const {
            query = '',
            people = 'anyone',
            shares = 'all',
            fromDate,
            toDate,
        } = req.query;

        // ONLY FILTER BY PUBLIC POSTS FOR NOW..
        const where: any = {
            visibility: 'PUBLIC',
            content: {
                contains: query,
                mode: 'insensitive'
            }
        };

        // FILTER POSTS BY AUTHOR OR FOLLOWING IDK
        if (people === 'following') {
            const following = await prisma.follow.findMany({
                where: { followerId: userId },
                select: { followingId: true }
            });

            const followingIds = following.map(f => f.followingId);

            where.authorId = {
                in: followingIds
            };
        }

        // FILTER BY SHARED OR ORIGINAL POSTS
        if (shares === 'posts') {
            where.isShared = false;
        }

        // DATE FILTERS
        if (fromDate) {
            const parsedFromDate = parseDateParam(fromDate, false);
            if (!parsedFromDate) {
                return res.status(400).json({
                    error: 'Invalid fromDate. Use YYYY-MM-DD or a valid ISO date.'
                });
            }

            where.createdAt = {
                gte: parsedFromDate
            };
        }

        if (toDate) {
            const parsedToDate = parseDateParam(toDate, true);
            if (!parsedToDate) {
                return res.status(400).json({
                    error: 'Invalid toDate. Use YYYY-MM-DD or a valid ISO date.'
                });
            }

            where.createdAt = {
                ...(where.createdAt || {}),
                lte: parsedToDate
            };
        }

        // QUERY POSTS DB
        const posts = await prisma.post.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true,
                        followers: {
                            where: { followerId: userId },
                            select: { id: true }
                        }
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        likes: true,
                        sharedPosts: true
                    }
                }
            }
        });

        // MAP POSTS TO INCLUDE THE FOLLOW INFO BRUH
        const mapped = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            isShared: post.isShared,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl,
                followers: post.author.followers,
                isFollowedByMe: post.author.followers.length > 0
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.sharedPosts
            }
        }));

        res.json({
            postsCount: mapped.length,
            posts: mapped
        });

    } catch (error) {
        next(error);
    }
}

export async function getUserPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.params.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        const posts = await prisma.post.findMany({
            where: { authorId: userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                content: true,
                location: true,
                createdAt: true,
                isShared: true,
                hideLikes: true,
                disableComments: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        likes: true,
                        sharedPosts: true
                    }
                }
            }
        });

        const mapped = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            isShared: post.isShared,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.sharedPosts
            }
        }));

        res.json({
            postsCount: mapped.length,
            posts: mapped
        });

    } catch (error) {
        next(error);
    }
}

export async function getFollowingPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user?.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(401).json({
                error: 'Unauthorized.'
            });
        };

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);

        const posts = await prisma.post.findMany({
            where: {
                authorId: {
                    in: followingIds
                },
                visibility: 'PUBLIC'
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                content: true,
                location: true,
                createdAt: true,
                isShared: true,
                hideLikes: true,
                disableComments: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatarUrl: true
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        likes: true,
                        sharedPosts: true
                    }
                }
            }
        });

        const mapped = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            location: post.location,
            isShared: post.isShared,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.sharedPosts
            }
        }));

        res.json({
            postsCount: mapped.length,
            posts: mapped
        });
    } catch (error) {
        next(error);
    }
}