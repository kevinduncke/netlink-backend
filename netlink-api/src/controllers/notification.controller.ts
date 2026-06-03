import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';
import { NotificationTypes } from "../config/generated/enums";

// CREATE A NOTIFICATION
export async function createNotification(
    userId: string,
    fromUserId: string,
    type: NotificationTypes,
    postId?: string,
    commentId?: string,
    likeId?: string,
    shareId?: string,
    followId?: string,
    content?: string
) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                fromUserId,
                type,
                postId: postId || null,
                commentId: commentId || null,
                likeId: likeId || null,
                shareId: shareId || null,
                followId: followId || null,
                content: content || null,
            }
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// GET USER NOTIFICATIONS
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user!.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                fromUser: true,
                post: true,
                comment: true,
                like: true,
                share: true,
                follow: true
            }
        });

        // Get all fromUserIds to fetch follows in one query
        const fromUserIds = notifications
            .map(n => n.fromUserId)
            .filter((id): id is string => id !== null);

        const follows = await prisma.follow.findMany({
            where: {
                followerId: (req as any).user!.id,
                followingId: { in: fromUserIds }
            },
            select: { followingId: true }
        });

        const followingSet = new Set(follows.map(f => f.followingId));

        const unReadNotificationsCount = notifications.filter(n => !n.read).length;

        const mappedNotifications = notifications.map(n => ({
            id: n.id,
            type: n.type,
            content: n.content,
            read: n.read,
            createdAt: n.createdAt,
            fromUser: n.fromUser ? {
                id: n.fromUser.id,
                name: n.fromUser.name,
                username: n.fromUser.username,
                avatarUrl: n.fromUser.avatarUrl,
            } : null,
            // CHECK IF I FOLLOW THE USER WHO GEN THE NOTIFICATION (fromUser)
            isFollowedByMe: n.fromUser ? followingSet.has(n.fromUser.id) : null
        }));

        type MappedNotification = (typeof mappedNotifications)[number];

        // MAP NOTIFICATIONS BASED ON THE DATE: TODAY, YESTERDAY.
        const newtime = new Date();
        const startOfToday = new Date(newtime.getFullYear(), newtime.getMonth(), newtime.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        const groupedNotifications = mappedNotifications.reduce(
            (acc: { today: MappedNotification[]; yesterday: MappedNotification[]; older: MappedNotification[] }, notification) => {
                const createdAt = new Date(notification.createdAt);

                if (createdAt >= startOfToday) {
                    acc.today.push(notification);
                } else if (createdAt >= startOfYesterday) {
                    acc.yesterday.push(notification);
                } else {
                    acc.older.push(notification);
                }
                return acc;
            },
            { today: [] as MappedNotification[], yesterday: [] as MappedNotification[], older: [] as MappedNotification[] }
        )

        res.json({
            today: groupedNotifications.today,
            yesterday: groupedNotifications.yesterday,
            older: groupedNotifications.older.slice(0, 3),
            unReadNotifications: unReadNotificationsCount
        });
    } catch (error) {
        next(error);
    }
};

// MARK A NOTIFICATION AS READ
export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user!.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });

        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};