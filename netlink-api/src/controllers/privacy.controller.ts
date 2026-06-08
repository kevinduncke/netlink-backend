import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

async function cleanUpBlocking(currentUserId: string, blockedUserId: string) {
    // REMOVE FOLLOW, FAVOTIRE, LIKES
    await prisma.follow.deleteMany({
        where: {
            OR: [
                { followerId: currentUserId, followingId: blockedUserId },
                { followerId: blockedUserId, followingId: currentUserId }
            ]
        }
    });
    await prisma.like.deleteMany({
        where: {
            OR: [
                { userId: currentUserId, post: { authorId: blockedUserId } },
                { userId: blockedUserId, post: { authorId: currentUserId } }
            ]
        }
    });
    await prisma.favorite.deleteMany({
        where: {
            OR: [
                { userId: currentUserId, favoriteId: blockedUserId },
                { userId: blockedUserId, favoriteId: currentUserId }
            ]
        }
    });

    // DEL CHATS
    const chats = await prisma.chat.findMany({
        where: {
            participants: {
                some: { userId: currentUserId },
            },
            AND: {
                participants: {
                    some: { userId: blockedUserId },
                }
            }
        },
        select: { id: true }
    });
    const chatIds = chats.map(chat => chat.id);
    await prisma.message.deleteMany({
        where: {
            chatId: { in: chatIds }
        }
    });
    await prisma.chatParticipant.deleteMany({
        where: {
            chatId: { in: chatIds }
        }
    });
    await prisma.chat.deleteMany({
        where: {
            id: { in: chatIds }
        }
    });

    // DEL NOTIFICATIONS, REPOSTS, COMMENTS
    await prisma.notification.deleteMany({
        where: {
            OR: [
                { userId: currentUserId, fromUserId: blockedUserId },
                { userId: blockedUserId, fromUserId: currentUserId }
            ]
        }
    });
    await prisma.share.deleteMany({
        where: {
            OR: [
                { userId: currentUserId, post: { authorId: blockedUserId } },
                { userId: blockedUserId, post: { authorId: currentUserId } }
            ]
        }
    });
    await prisma.comment.deleteMany({
        where: {
            OR: [
                { authorId: currentUserId, post: { authorId: blockedUserId } },
                { authorId: blockedUserId, post: { authorId: currentUserId } }
            ]
        }
    });
}

export async function blockUser(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;
        const blockedUserId = req.params.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid User ID.' });
        }

        if (!blockedUserId || typeof blockedUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid Blocked User ID.' });
        }

        if (currentUserId === blockedUserId) {
            return res.status(400).json({ error: 'You cannot block yourself, Check what are you doing!.' });
        }


        const block = await prisma.block.upsert({
            where: {
                userId_blockedId: {
                    userId: currentUserId,
                    blockedId: blockedUserId
                }
            },
            update: {}, // PREV DUP
            create: {
                userId: currentUserId,
                blockedId: blockedUserId
            }
        });

        await cleanUpBlocking(currentUserId, blockedUserId);

        res.json({ message: 'User blocked successfully :(', block });
    } catch (error) {
        next(error);
    }
}

export async function unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;
        const blockedUserId = req.params.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid User ID.' });
        }

        if (!blockedUserId || typeof blockedUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid Blocked User ID.' });
        }

        if (currentUserId === blockedUserId) {
            return res.status(400).json({ error: 'You cannot unblock yourself, something strange is happening.' });
        }

        await prisma.block.delete({
            where: {
                userId_blockedId: {
                    userId: currentUserId,
                    blockedId: blockedUserId
                }
            }
        });

        res.json({ message: 'User unblocked successfully :)' });
    } catch (error) {
        next(error);
    }
}

export async function muteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;
        const mutedUserId = req.params.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid User ID.' });
        }

        if (!mutedUserId || typeof mutedUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid Muted User ID.' });
        }

        if (currentUserId === mutedUserId) {
            return res.status(400).json({ error: 'You cannot mute yourself, speak freely!' });
        }

        const mute = await prisma.mute.upsert({
            where: {
                userId_mutedId: {
                    userId: currentUserId,
                    mutedId: mutedUserId
                }
            },
            update: {}, // PREV DUP
            create: {
                userId: currentUserId,
                mutedId: mutedUserId
            }
        });

        res.json({ message: 'User muted successfully :|', mute });
    } catch (error) {
        next(error);
    }
}

export async function unmuteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const currentUserId = (req as any).user!.id;
        const mutedUserId = req.params.id;

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid User ID.' });
        }

        if (!mutedUserId || typeof mutedUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid Muted User ID.' });
        }

        if (currentUserId === mutedUserId) {
            return res.status(400).json({ error: 'You cannot unmute yourself, just shut up!' });
        }

        await prisma.mute.delete({
            where: {
                userId_mutedId: {
                    userId: currentUserId,
                    mutedId: mutedUserId
                }
            }
        });

        res.json({ message: 'User unmuted successfully :)' });
    } catch (error) {
        next(error);
    }
}

export async function reportUser(req: Request, res: Response, next: NextFunction) {
    try {
        const reporterId = (req as any).user!.id;
        const { targetUserId, postId, commentId, messageId, reason, details } = req.body;

        const report = await prisma.report.create({
            data: {
                reporterId,
                targetUserId,
                postId,
                messageId,
                reason,
                details
            }
        });

        res.json({ message: 'User reported successfully. We will review the case as soon as possible (Maybe).', report });
    } catch (error) {
        next(error);
    }
}