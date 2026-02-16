import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

// GET USER NOTIFICATIONS
export async function getNotifications(req: Request, res: Response, next: NextFunction){
    try {
        const userId = (req as any).user!.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        res.json(notifications);
    } catch (error) {
        next(error);
    }
};

// MARK A NOTIFICATION AS READ
export async function markAsRead(req: Request, res: Response, next: NextFunction){
    try {
        const id = req.params.id;

        if(!id || typeof id !== 'string'){
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