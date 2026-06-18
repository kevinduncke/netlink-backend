import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { encodeCursor, decodeCursor } from '../utils/cursor';

async function resolveRepostTarget(id: string) {
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

export async function createPost(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user.id;
        const {
            content,
            location,
            imageUrl,
            hideLikes,
            disableComments,
            mentions,
            specificFollowers // AN ARRAY OF USER IDS
        } = req.body;

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
                    connect: { id: currentUserId }
                },

                // ONLY CONNECT IF VISIBILITY IS SPECIFIC TO
                ...(visibility === 'SPECIFIC' && {
                    specificTo: {
                        connect: specificFollowers.map((id: string) => (id))
                    }
                })
            },
        });

        const mentionedUsers = await prisma.user.findMany({
            where: {
                username: {
                    in: mentions?.map((m: any) => m.username) || []
                }
            },
            select: {
                id: true,
            }
        });

        const mentionData = mentionedUsers.map(user => ({
            userId: user.id
        }));

        await prisma.mention.createMany({
            data: mentionData.map(m => ({
                userId: m.userId,
                postId: post.id,
                fromUserId: currentUserId,
            }))
        });

        await prisma.notification.createMany({
            data: mentionedUsers.map(user => ({
                userId: user.id,
                fromUserId: currentUserId,
                type: 'MENTION',
                postId: post.id,
                content: 'mentioned you in a post.'
            }))
        });

        // RESPOND WITH CREATED POST
        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
}

export async function getPost(req: Request, res: Response, next: NextFunction) {
    try {
        const postId = req.params.id;

        console.log('Fetching post with ID:', postId);

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({ error: 'Valid post ID is required.' });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                content: true,
                location: true,
                imageUrl: true,
                hideLikes: true,
                disableComments: true,
                createdAt: true,
                mentions: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        comments: true,
                        likes: true,
                        shares: true
                    }
                },
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

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const comments = await prisma.comment.findMany({
            where: {
                postId: postId
            },
            orderBy: {
                createdAt: 'desc'
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

        const likes = await prisma.like.findMany({
            where: {
                postId: postId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
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

        const shares = await prisma.share.findMany({
            where: {
                postId: postId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
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

        const mappedPost = {
            id: post.id,
            content: post.content,
            location: post.location,
            imageUrl: post.imageUrl,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            createdAt: post.createdAt,
            isRepost: false,
            mentions: post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            })),
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.shares
            },
            comments: comments.map(comment => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                author: comment.author,
            })),
            likes: likes.map(like => ({
                id: like.id,
                user: like.user,
                createdAt: like.createdAt,
            })),
            shares: shares.map(share => ({
                id: share.id,
                user: share.user,
                createdAt: share.createdAt,
            })),
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl,
                liked: likes.length > 0,
            }
        };

        res.json(mappedPost);
    } catch (error) {
        next(error);
    }
}
export async function getMyPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user.id;
        const { cursor, limit = '10' } = req.query;
        const take = parseInt(limit as string, 10);

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        const cursorDate = cursor ? decodeCursor(cursor as string) : undefined;
        const overFetch = take * 2;

        const user = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                likes: {
                    select: {
                        postId: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // BOTH QUERIES
        const [posts, reposts] = await Promise.all([
            prisma.post.findMany({
                where: {
                    authorId: currentUserId,
                    ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                select: {
                    id: true,
                    content: true,
                    location: true,
                    imageUrl: true,
                    hideLikes: true,
                    disableComments: true,
                    createdAt: true,
                    mentions: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                            shares: true
                        }
                    }
                }
            }),
            prisma.share.findMany({
                where: {
                    userId: currentUserId,
                    ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            location: true,
                            imageUrl: true,
                            hideLikes: true,
                            disableComments: true,
                            createdAt: true,
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    avatarUrl: true
                                }
                            },
                            mentions: {
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            username: true,
                                        }
                                    }
                                }
                            },
                            _count: {
                                select: {
                                    comments: true,
                                    likes: true,
                                    shares: true
                                }
                            }
                        }
                    },
                    user: true,
                }
            })
        ]);

        const mappedPosts = posts.map(post => ({
            id: post.id,
            content: post.content,
            imageUrl: post.imageUrl,
            location: post.location,
            createdAt: post.createdAt,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            isRepost: false,
            repostedByMe: false,
            repostedAt: null,
            feedDate: post.createdAt,
            author: {
                id: user.id,
                name: user.name,
                username: user.username,
                avatarUrl: user.avatarUrl,
                liked: user.likes.some(likePost => likePost.postId === post.id),
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.shares
            },
            mentions: post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            }))
        }));

        const mappedReposts = reposts.map(r => ({
            id: r.id,
            postId: r.post.id,
            content: r.post.content,
            imageUrl: r.post.imageUrl,
            location: r.post.location,
            createdAt: r.post.createdAt,
            hideLikes: r.post.hideLikes,
            disableComments: r.post.disableComments,
            isRepost: true,
            repostedByMe: r.user.id === currentUserId,
            repostedAt: r.createdAt,
            feedDate: r.createdAt,
            author: {
                id: r.post.author.id,
                name: r.post.author.name,
                username: r.post.author.username,
                avatarUrl: r.post.author.avatarUrl,
                liked: user.likes.some(likePost => likePost.postId === r.post.id),
            },
            _count: {
                comments: r.post._count.comments,
                likes: r.post._count.likes,
                shares: r.post._count.shares
            },
            repostedBy: {
                id: r.user.id,
                name: r.user.name,
                username: r.user.username,
                avatarUrl: r.user.avatarUrl,
                bio: r.user.bio,
            },
            mentions: r.post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            }))
        }));

        const merged = [...mappedPosts, ...mappedReposts].sort((a, b) => new Date(b.feedDate).getTime() - new Date(a.feedDate).getTime()).slice(0, take);

        const lastItem = merged[merged.length - 1];
        const nextCursor = merged.length === take && lastItem ? encodeCursor(lastItem.feedDate) : null;

        res.json({ posts: merged, nextCursor });
    } catch (error) {
        next(error);
    }
}
export async function searchPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user?.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

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
            people,
            shared,
            fromDate,
            toDate,
        } = req.query;

        // FILTER POSTS BY AUTHOR OR FOLLOWING IDK
        const following = await prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);

        const blocked = await prisma.block.findMany({
            where: { userId: currentUserId },
            select: { blockedId: true }
        });

        const restrictedUser = await prisma.mute.findFirst({
            where: {
                mutedId: currentUserId
            },
            select: {
                mutedId: true,
                userId: true
            }
        });

        const muted = await prisma.mute.findMany({
            where: {
                userId: currentUserId
            },
            select: {
                id: true,
                mutedId: true,
                userId: true
            }
        });

        // ONLY FILTER BY PUBLIC POSTS FOR NOW..
        // FILTER POSTS FROM USER THAT HAS PRIVACY MODE ENABLED (TRUE) AND IS NOT FOLLOWED BY CURRENT USER (FALSE)
        const where: any = {
            visibility: 'PUBLIC',
            content: {
                contains: query,
                mode: 'insensitive'
            },
            authorId: { not: currentUserId },
            AND: [
                {
                    OR: [
                        { author: { privacyMode: false } },
                        { authorId: { in: followingIds } }
                    ]
                }
            ],
            NOT: [
                { authorId: { in: blocked.map(b => b.blockedId) } }
            ]
        };

        if (people === 'following') {
            where.authorId = {
                in: followingIds
            };
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
                            where: { followerId: currentUserId },
                            select: { id: true }
                        },
                        following: {
                            where: { followingId: currentUserId },
                            select: {
                                id: true,
                                followerId: true,
                            }
                        }
                    }
                },
                likes: {
                    where: { userId: currentUserId },
                    select: { id: true }
                },
                _count: {
                    select: {
                        comments: {
                            where: {
                                authorId: { notIn: blocked.map(b => b.blockedId) }
                            }
                        },
                        likes: {
                            where: {
                                userId: { notIn: blocked.map(b => b.blockedId) }
                            }
                        },
                        shares: {
                            where: {
                                userId: { notIn: blocked.map(b => b.blockedId) }
                            }
                        }
                    }
                },
                mentions: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                            }
                        }
                    }
                },
            }
        });

        // MAP POSTS TO INCLUDE THE FOLLOW INFO BRUH
        const mappedPosts = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            isRepost: false,
            repostedByMe: false,
            repostedAt: null,
            feedDate: post.createdAt,
            isRestrictedByMe: muted.some(m => m.mutedId === post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? post.author.following.some(f => f.followerId === currentUserId) : false,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl,
                followers: post.author.followers,
                liked: post.likes.length > 0,
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.shares
            },
            postsCount: posts.length,
            mentions: post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            }))
        }));

        const reposts = await prisma.share.findMany({
            where: {
                userId: {
                    in: followingIds
                },
                post: {
                    AND: [
                        { visibility: 'PUBLIC' },
                        {
                            OR: [
                                { author: { privacyMode: false } },
                                { authorId: { in: followingIds } },
                            ]
                        }
                    ]
                }
            },
            include: {
                post: {
                    select: {
                        id: true,
                        content: true,
                        location: true,
                        imageUrl: true,
                        hideLikes: true,
                        disableComments: true,
                        createdAt: true,
                        author: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                avatarUrl: true,
                                following: {
                                    where: { followingId: currentUserId },
                                    select: {
                                        id: true,
                                        followerId: true,
                                    }
                                }
                            }
                        },
                        likes: {
                            where: { userId: currentUserId },
                            select: { id: true }
                        },
                        _count: {
                            select: {
                                comments: {
                                    where: {
                                        authorId: { notIn: blocked.map(b => b.blockedId) }
                                    }
                                },
                                likes: {
                                    where: {
                                        userId: { notIn: blocked.map(b => b.blockedId) }
                                    }
                                },
                                shares: {
                                    where: {
                                        userId: { notIn: blocked.map(b => b.blockedId) }
                                    }
                                }
                            }
                        },
                        mentions: {
                            select: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                    }
                                }
                            }
                        },
                    }
                },
                user: true,
            }
        });

        const mappedReposts = reposts.map(r => ({
            id: r.id,
            postId: r.post.id,
            content: r.post.content,
            imageUrl: r.post.imageUrl,
            location: r.post.location,
            createdAt: r.post.createdAt,
            hideLikes: r.post.hideLikes,
            disableComments: r.post.disableComments,
            isRepost: true,
            repostedAt: r.createdAt,
            repostedByMe: r.post.author.id === currentUserId,
            feedDate: r.createdAt,
            isRestrictedByMe: muted.some(m => m.mutedId === r.post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: r.post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? r.post.author.following.some(f => f.followerId === currentUserId) : false,
            author: {
                id: r.post.author.id,
                name: r.post.author.name,
                username: r.post.author.username,
                avatarUrl: r.post.author.avatarUrl,
                liked: r.post.likes.length > 0,
            },
            _count: {
                comments: r.post._count.comments,
                likes: r.post._count.likes,
                shares: r.post._count.shares
            },
            repostedBy: {
                id: r.user.id,
                name: r.user.name,
                username: r.user.username,
                avatarUrl: r.user.avatarUrl,
                bio: r.user.bio,
            },
            mentions: r.post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            }))
        }));

        const merged = [...mappedPosts, ...mappedReposts].sort(
            (a, b) => new Date(b.feedDate).getTime() - new Date(a.feedDate).getTime()
        );

        if (shared === 'posts') {
            res.json({ posts: mappedPosts, nextCursor: null });
        } else {
            res.json({ posts: merged, nextCursor: null });
        }
    } catch (error) {
        next(error);
    }
}
export async function getUserPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user?.id;
        const clientId = req.params.id;
        const { cursor, limit = '10' } = req.query;
        const take = parseInt(limit as string, 10);

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(401).json({
                error: 'Unauthorized.'
            });
        };

        if (!clientId || typeof clientId !== 'string') {
            return res.status(400).json({
                error: 'Valid client ID is required.'
            });
        };

        const cursorDate = cursor ? decodeCursor(cursor as string) : undefined;
        const overFetch = take * 2;

        // FILTER POSTS BY AUTHOR OR FOLLOWING IDK
        const following = await prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);

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

        const blockedComments = blockedIds.filter(id => id !== currentUserId);

        const restrictedUser = await prisma.mute.findUnique({
            where: {
                userId_mutedId: {
                    userId: clientId,
                    mutedId: currentUserId
                }
            },
            select: {
                mutedId: true,
                userId: true
            }
        });

        const muted = await prisma.mute.findMany({
            where: {
                userId: currentUserId
            },
            select: {
                id: true,
                mutedId: true,
                userId: true
            }
        });

        // FILTER POSTS FROM USER THAT HAS PRIVACY MODE ENABLED (TRUE) AND IS NOT FOLLOWED BY CURRENT USER (FALSE)
        const privacyFilter = followingIds.length > 0 ? {
            OR: [
                { author: { privacyMode: false } },
                { authorId: { in: followingIds } }
            ]
        } : {
            author: { privacyMode: false }
        };

        // FILTER REPOSTS BY THE USER WHO CREATED THE SHARE, NOT BY THE ORIGINAL POST AUTHOR
        const repostPrivacyFilter = followingIds.length > 0 ? {
            OR: [
                { privacyMode: false },
                { id: { in: followingIds } }
            ]
        } : {
            privacyMode: false
        };

        const [posts, reposts] = await Promise.all([
            prisma.post.findMany({
                where: {
                    AND: [privacyFilter],
                    OR: [
                        {
                            authorId: clientId,
                            visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
                        },
                        {
                            authorId: clientId,
                            visibility: 'SPECIFIC',
                            specificTo: {
                                some: {
                                    id: currentUserId,
                                },
                            },
                        }
                    ],
                    ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                select: {
                    id: true,
                    content: true,
                    location: true,
                    createdAt: true,
                    hideLikes: true,
                    disableComments: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            avatarUrl: true,
                            following: {
                                where: { followingId: currentUserId },
                                select: {
                                    id: true,
                                    followerId: true,
                                }
                            }
                        }
                    },
                    likes: {
                        where: { userId: currentUserId },
                        select: { id: true }
                    },
                    mentions: {
                        select: {
                            userId: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            comments: {
                                where: {
                                    authorId: { notIn: blockedComments }
                                }
                            },
                            likes: {
                                where: {
                                    userId: { notIn: blocked.map(b => b.blockedId) }
                                }
                            },
                            shares: {
                                where: {
                                    userId: { notIn: blocked.map(b => b.blockedId) }
                                }
                            }
                        }
                    },
                }
            }),

            prisma.share.findMany({
                where: {
                    userId: clientId,
                    user: repostPrivacyFilter,
                    ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            location: true,
                            imageUrl: true,
                            hideLikes: true,
                            disableComments: true,
                            createdAt: true,
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    avatarUrl: true,
                                    following: {
                                        where: { followingId: currentUserId },
                                        select: {
                                            id: true,
                                            followerId: true,
                                        }
                                    }
                                }
                            },
                            likes: {
                                where: { userId: currentUserId },
                                select: { id: true }
                            },
                            mentions: {
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            username: true,
                                        }
                                    }
                                }
                            },
                            _count: {
                                select: {
                                    comments: {
                                        where: {
                                            authorId: { notIn: blockedComments }
                                        }
                                    },
                                    likes: {
                                        where: {
                                            userId: { notIn: blocked.map(b => b.blockedId) }
                                        }
                                    },
                                    shares: {
                                        where: {
                                            userId: { notIn: blocked.map(b => b.blockedId) }
                                        }
                                    }
                                }
                            },
                        }
                    },
                    user: true,
                }
            })
        ]);

        // MAPs    
        const mappedPosts = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            isRepost: false,
            repostedByMe: false,
            repostedAt: null,
            feedDate: post.createdAt,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl,
                liked: post.likes.length > 0,
            },
            mentions: post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            })),
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.shares
            },
            postsCount: posts.length,
            isRestrictedByMe: muted.some(m => m.mutedId === post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? post.author.following.some(f => f.followerId === currentUserId) : false,
        }));

        const mappedReposts = reposts.map(r => ({
            id: r.id,
            postId: r.post.id,
            content: r.post.content,
            imageUrl: r.post.imageUrl,
            location: r.post.location,
            createdAt: r.post.createdAt,
            hideLikes: r.post.hideLikes,
            disableComments: r.post.disableComments,
            isRepost: true,
            repostedByMe: r.post.author.id === currentUserId,
            repostedAt: r.createdAt,
            feedDate: r.createdAt,
            author: {
                id: r.post.author.id,
                name: r.post.author.name,
                username: r.post.author.username,
                avatarUrl: r.post.author.avatarUrl,
                liked: r.post.likes.length > 0,
            },
            mentions: r.post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            })),
            _count: {
                comments: r.post._count.comments,
                likes: r.post._count.likes,
                shares: r.post._count.shares
            },
            repostedBy: {
                id: r.user.id,
                name: r.user.name,
                username: r.user.username,
                avatarUrl: r.user.avatarUrl,
                bio: r.user.bio,
            },
            isRestrictedByMe: muted.some(m => m.mutedId === r.post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: r.post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? r.post.author.following.some(f => f.followerId === currentUserId) : false,
        }));

        const merged = [...mappedPosts, ...mappedReposts].sort((a, b) => new Date(b.feedDate).getTime() - new Date(a.feedDate).getTime()).slice(0, take);

        const lastItem = merged[merged.length - 1];
        const nextCursor = merged.length === take && lastItem ? encodeCursor(lastItem.feedDate) : null;

        res.json({ posts: merged, nextCursor });
    } catch (error) {
        next(error);
    }
}
export async function getAllPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user?.id;
        const { cursor, limit = '10' } = req.query;
        const take = parseInt(limit as string, 10);

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(401).json({
                error: 'Unauthorized.'
            });
        };

        // DECODE CURSOR
        const cursorDate = cursor ? decodeCursor(cursor as string) : undefined;

        const following = await prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);

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

        const blockedComments = blockedIds.filter(id => id !== currentUserId);

        const restrictedUser = await prisma.mute.findFirst({
            where: {
                mutedId: currentUserId
            },
            select: {
                mutedId: true,
                userId: true
            }
        });

        const muted = await prisma.mute.findMany({
            where: {
                userId: currentUserId
            },
            select: {
                id: true,
                mutedId: true,
                userId: true
            }
        });

        const visibilityFilter = {
            OR: [
                { author: { privacyMode: false } },
                { authorId: { in: followingIds } }
            ],
            NOT: [
                { authorId: { in: blocked.map(b => b.blockedId) } }
            ]
        };

        // Over-fetching both queries using cursor as a date boundary.
        const overFetch = take * 2;

        const [posts, reposts] = await Promise.all([
            prisma.post.findMany({
                where: {
                    visibility: 'PUBLIC',
                    authorId: { not: currentUserId },
                    AND: [
                        visibilityFilter,
                        ...(cursorDate ? [{ createdAt: { lt: cursorDate } }] : [])
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    hideLikes: true,
                    disableComments: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            avatarUrl: true,
                            privacyMode: true,
                            following: {
                                select: {
                                    id: true,
                                    followerId: true
                                }
                            }
                        }
                    },
                    likes: {
                        where: { userId: currentUserId },
                        select: { id: true }
                    },
                    _count: {
                        select: {
                            comments: {
                                where: {
                                    authorId: { notIn: blockedComments }
                                }
                            },
                            likes: {
                                where: {
                                    userId: { notIn: blockedComments }
                                }
                            },
                            shares: {
                                where: {
                                    userId: { notIn: blockedComments }
                                }
                            },
                        }
                    },
                    mentions: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                }
                            }
                        }
                    }
                }
            }),

            prisma.share.findMany({
                where: {
                    userId: { not: currentUserId },
                    ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
                    post: {
                        AND: [
                            { visibility: 'PUBLIC' },
                            visibilityFilter,
                        ]
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            location: true,
                            imageUrl: true,
                            hideLikes: true,
                            disableComments: true,
                            createdAt: true,
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    avatarUrl: true,
                                    privacyMode: true,
                                    following: {
                                        select: {
                                            id: true,
                                            followerId: true
                                        }
                                    }
                                }
                            },
                            likes: {
                                where: { userId: currentUserId },
                                select: { id: true }
                            },
                            mentions: {
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            username: true,
                                        }
                                    }
                                }
                            },
                            _count: {
                                select: {
                                    comments: {
                                        where: {
                                            authorId: { notIn: blockedComments }
                                        }
                                    },
                                    likes: {
                                        where: {
                                            userId: { notIn: blockedComments }
                                        }
                                    },
                                    shares: {
                                        where: {
                                            userId: { notIn: blockedComments }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    user: true,
                }
            })
        ]);

        const mappedPosts = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            feedDate: post.createdAt,
            isRepost: false,
            repostedByMe: false,
            repostedAt: null,
            isRestrictedByMe: muted.some(m => m.mutedId === post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? post.author.following.some(f => f.followerId === currentUserId) : false,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl,
                liked: post.likes.length > 0,
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.shares
            },
            postsCount: posts.length,
            mentions: post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            })),

        }));

        const mappedReposts = reposts.map(r => ({
            id: r.id,
            postId: r.post.id,
            content: r.post.content,
            imageUrl: r.post.imageUrl,
            location: r.post.location,
            createdAt: r.post.createdAt,
            hideLikes: r.post.hideLikes,
            disableComments: r.post.disableComments,
            feedDate: r.createdAt,
            isRepost: true,
            repostedByMe: r.post.author.id === currentUserId,
            repostedAt: r.createdAt,
            isRestrictedByMe: muted.some(m => m.mutedId === r.post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: r.post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? r.post.author.following.some(f => f.followerId === currentUserId) : false,
            author: {
                id: r.post.author.id,
                name: r.post.author.name,
                username: r.post.author.username,
                avatarUrl: r.post.author.avatarUrl,
                liked: r.post.likes.length > 0,
            },
            _count: {
                comments: r.post._count.comments,
                likes: r.post._count.likes,
                shares: r.post._count.shares
            },
            repostedBy: {
                id: r.user.id,
                name: r.user.name,
                username: r.user.username,
                avatarUrl: r.user.avatarUrl,
                bio: r.user.bio,
            },
            mentions: r.post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            }))
        }));

        const merged = [...mappedPosts, ...mappedReposts].sort((a, b) => new Date(b.feedDate).getTime() - new Date(a.feedDate).getTime()).slice(0, take);

        const lastMergedItem = merged[merged.length - 1];
        const nextCursor = merged.length === take && lastMergedItem
            ? encodeCursor(lastMergedItem.feedDate) : null;

        res.json({ posts: merged, nextCursor });
    } catch (error) {
        next(error);
    }
}
export async function getFollowingPosts(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user?.id;
        const { cursor, limit = '10' } = req.query;
        const take = parseInt(limit as string, 10);

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(401).json({
                error: 'Unauthorized.'
            });
        };

        const following = await prisma.follow.findMany({
            where: { followerId: currentUserId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);
        if (followingIds.length === 0) {
            return res.json([]);
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

        const blockedComments = blockedIds.filter(id => id !== currentUserId);

        const restrictedUser = await prisma.mute.findFirst({
            where: {
                mutedId: currentUserId
            },
            select: {
                mutedId: true,
                userId: true
            }
        });

        const muted = await prisma.mute.findMany({
            where: {
                userId: currentUserId
            },
            select: {
                id: true,
                mutedId: true,
                userId: true
            }
        });

        const cursorDate = cursor ? decodeCursor(cursor as string) : undefined;
        const overFetch = take * 2;

        const [posts, reposts] = await Promise.all([
            prisma.post.findMany({
                where: {
                    OR: [
                        {
                            authorId: { in: followingIds },
                            visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
                        },
                        {
                            authorId: { in: followingIds },
                            visibility: 'SPECIFIC',
                            specificTo: {
                                some: {
                                    id: currentUserId,
                                },
                            },
                        }
                    ],
                    ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                select: {
                    id: true,
                    content: true,
                    location: true,
                    createdAt: true,
                    hideLikes: true,
                    disableComments: true,
                    author: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            avatarUrl: true,
                            following: {
                                where: { followingId: currentUserId },
                                select: {
                                    id: true,
                                    followerId: true,
                                }
                            }
                        }
                    },
                    likes: {
                        where: { userId: currentUserId },
                        select: { id: true }
                    },
                    _count: {
                        select: {
                            comments: {
                                where: {
                                    authorId: { notIn: blockedComments }
                                }
                            },
                            likes: {
                                where: {
                                    userId: { notIn: blockedComments }
                                }
                            },
                            shares: {
                                where: {
                                    userId: { notIn: blockedComments }
                                }
                            }
                        }
                    },
                    mentions: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                }
                            }
                        }
                    },
                }
            }),

            prisma.share.findMany({
                where: {
                    userId: { in: followingIds },
                    ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
                },
                orderBy: { createdAt: 'desc' },
                take: overFetch,
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            location: true,
                            imageUrl: true,
                            hideLikes: true,
                            disableComments: true,
                            createdAt: true,
                            author: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    avatarUrl: true,
                                    following: {
                                        where: { followingId: currentUserId },
                                        select: {
                                            id: true,
                                            followerId: true,
                                        }
                                    }
                                }
                            },
                            likes: {
                                where: { userId: currentUserId },
                                select: { id: true }
                            },
                            _count: {
                                select: {
                                    comments: {
                                        where: {
                                            authorId: { notIn: blockedComments }
                                        }
                                    },
                                    likes: {
                                        where: {
                                            userId: { notIn: blockedComments }
                                        }
                                    },
                                    shares: {
                                        where: {
                                            userId: { notIn: blockedComments }
                                        }
                                    }
                                }
                            },
                            mentions: {
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            username: true,
                                        }
                                    }
                                }
                            },
                        }
                    },
                    user: true,
                }
            })
        ]);

        const mappedPosts = posts.map(post => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            location: post.location,
            hideLikes: post.hideLikes,
            disableComments: post.disableComments,
            isRepost: false,
            repostedByMe: false,
            repostedAt: null,
            feedDate: post.createdAt,
            isRestrictedByMe: muted.some(m => m.mutedId === post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? post.author.following.some(f => f.followerId === currentUserId) : false,
            author: {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl,
                liked: post.likes.length > 0,
            },
            _count: {
                comments: post._count.comments,
                likes: post._count.likes,
                shares: post._count.shares
            },
            mentions: post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            })),
            postsCount: posts.length
        }));

        const mappedReposts = reposts.map(r => ({
            id: r.id,
            postId: r.post.id,
            content: r.post.content,
            imageUrl: r.post.imageUrl,
            location: r.post.location,
            createdAt: r.post.createdAt,
            hideLikes: r.post.hideLikes,
            disableComments: r.post.disableComments,
            isRepost: true,
            repostedByMe: r.post.author.id === currentUserId,
            repostedAt: r.createdAt,
            feedDate: r.createdAt,
            isRestrictedByMe: muted.some(m => m.mutedId === r.post.author.id) && muted.some(m => m.userId === currentUserId),
            userRestrictedMe: r.post.author.id === restrictedUser?.userId,
            isFollowedByMe: currentUserId ? r.post.author.following.some(f => f.followerId === currentUserId) : false,
            author: {
                id: r.post.author.id,
                name: r.post.author.name,
                username: r.post.author.username,
                avatarUrl: r.post.author.avatarUrl,
                liked: r.post.likes.length > 0,
            },
            _count: {
                comments: r.post._count.comments,
                likes: r.post._count.likes,
                shares: r.post._count.shares
            },
            repostedBy: {
                id: r.user.id,
                name: r.user.name,
                username: r.user.username,
                avatarUrl: r.user.avatarUrl,
                bio: r.user.bio,
            },
            mentions: r.post.mentions.map(m => ({
                id: m.user.id,
                name: m.user.name,
                username: m.user.username,
            })),
        }));

        const merged = [...mappedPosts, ...mappedReposts].sort((a, b) => new Date(b.feedDate).getTime() - new Date(a.feedDate).getTime()).slice(0, take);

        const lastItem = merged[merged.length - 1];
        const nextCursor = merged.length === take && lastItem ? encodeCursor(lastItem.feedDate) : null;

        res.json({ posts: merged, nextCursor });
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


export async function createRepost(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user.id;
        const postId = req.params.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({
                error: 'Valid post ID is required.'
            });
        }

        const post = await resolveRepostTarget(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const alreadyRepost = await prisma.share.findFirst({
            where: {
                userId: currentUserId,
                postId: post.id,
            }
        });

        if (alreadyRepost) {
            return res.status(400).json({ error: 'You have already reposted this post.' });
        }

        // CREATE REPOST
        const repost = await prisma.share.create({
            data: {
                userId: currentUserId,
                postId: post.id
            }
        });

        await prisma.notification.create({
            data: {
                userId: (await prisma.post.findUnique({ where: { id: post.id } }))!.authorId,
                fromUserId: currentUserId,
                type: 'REPOST',
                postId: post.id,
                shareId: repost.id,
                content: 'reposted your post.'
            }
        })

        res.status(201).json({ message: "Post reposted successfully.", repost });
    } catch (error) {
        next(error);
    }
}
export async function deleteRepost(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user.id;
        const postId = req.params.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({
                error: 'Valid user ID is required.'
            });
        };

        if (!postId || typeof postId !== 'string') {
            return res.status(400).json({
                error: 'Valid post ID is required.'
            });
        }

        const repost = await prisma.share.findUnique({
            where: { userId_postId: { userId: currentUserId, postId: postId } }
        });

        if (!repost) {
            return res.status(403).json({ error: 'Not authorized to delete this repost.' });
        }

        await prisma.share.delete({
            where: { userId_postId: { userId: currentUserId, postId: postId } }
        });

        res.json({ success: true, message: "Repost deleted successfully." });
    } catch (error) {
        next(error);
    }
}