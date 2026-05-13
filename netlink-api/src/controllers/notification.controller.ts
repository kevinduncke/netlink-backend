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

        res.json(notifications);
    } catch (error) {
        next(error);
    }
};

// MARK A NOTIFICATION AS READ
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid notification ID.' });
        }

        await prisma.notification.update({
            where: { id },
            data: { read: true },
        });

        res.json({ success: true, message: 'Notification marked as read.' });
    } catch (error) {
        next(error);
    }
};