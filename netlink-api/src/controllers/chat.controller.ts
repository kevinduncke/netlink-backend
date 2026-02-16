import { Request, Response, NextFunction } from "express";
import { prisma } from '../config/prisma';

// NEW CHAT
export async function createChat(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = req.body;
        const currentUserId = (req as any).user!.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        if (!currentUserId || typeof currentUserId !== 'string') {
            return res.status(400).json({ error: 'Invalid current user ID.' });
        }

        const chat = await prisma.chat.create({
            data: {
                users: {
                    connect: [
                        { id: currentUserId },
                        { id: userId }
                    ]
                },
            },
            include: {
                users: true
            },
        });

        res.status(201).json(chat);
    } catch (error) {
        next(error);
    }
};

// GET ALL CHATS
export async function getUserChats(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = (req as any).user!.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const chats = await prisma.chat.findMany({
            where: {
                users: {
                    some: { id: userId }
                }
            },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                messages: {
                    _count: 'desc'
                }
            }
        });

        // SHOW THE OTHER USER INSTEAD OF ALL USERS
        const formattedChats = chats.map(chat => {
            const otherUser = chat.users.filter(user => user.id !== userId);
            return {
                id: chat.id,
                otherUser,
                lastMessage: chat.messages[0] || null,
            };
        });

        res.json(formattedChats);
    } catch (error) {
        next(error);
    }
}

// CREATE NEW MESSAGE
export async function newMessage(req: Request, res: Response, next: NextFunction) {
    try {
        const chatId = req.params.id;
        const { content } = req.body;
        const senderId = (req as any).user!.id;

        if (!chatId || typeof chatId !== 'string') {
            console.log('Invalid chat ID:', chatId);
            console.log('Sender ID: ', senderId);
            return res.status(400).json({ error: 'Invalid chat ID.' });
        }

        if (!senderId || typeof senderId !== 'string') {
            console.log('Invalid sender ID:', senderId);
            return res.status(400).json({ error: 'Invalid sender ID.', senderId });
        }

        const message = await prisma.message.create({
            data: {
                content,
                chatId,
                senderId
            },
        });

        res.status(201).json(message);
    } catch (error) {
        next(error);
    }
}

// GET ALL MESSAGES IN A CHAT
export async function getChatMessages(req: Request, res: Response, next: NextFunction) {
    try {
        const rawChatId = req.params.id;
        const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId;
        const userId = (req as any).user!.id;

        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required.' });
        }

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        // PAGINATION PARAMS
        const limit = Number(req.query.limit) || 20;
        const cursor = req.query.cursor ? String(req.query.cursor) : null;

        // UCC (USER CHAT CHECK)
        const ucc = await prisma.chat.findFirst({
            where: {
                id: chatId,
                users: {
                    some: { id: userId }
                }
            }
        });
        if (!ucc) {
            return res.status(404).json({ error: "You're not part of this chat, back off!" });
        }

        // FETCH MESSAGES WITH PAG
        const message = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
            take: limit,
            ...(cursor && {
                skip: 1,
                cursor: { id: cursor }
            })
        });

        // NEXT CURSOR
        const nextCursor = message.length === limit ? message[message.length - 1]?.id : null;

        res.json({ message, nextCursor });

    } catch (error) {
        next(error);
    }
}