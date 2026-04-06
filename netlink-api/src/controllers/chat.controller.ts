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
                        username: true,
                        name: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                messages: {
                    _count: 'desc'
                }
            }
        });

        // SHOW THE OTHER USER AS A SINGLE OBJECT INSTEAD OF AN ARRAY
        const formattedChats = chats
            .map(chat => {
                const receiver = chat.users.find(user => user.id !== userId);

                if (!receiver) {
                    return null;
                }

                return {
                    chatId: chat.id,
                    receiver: {
                        id: receiver.id,
                        username: receiver.username,
                        name: receiver.name,
                        avatarUrl: receiver.avatarUrl ?? undefined
                    }
                };
            })
            .filter((chat): chat is NonNullable<typeof chat> => chat !== null);

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

        // UCC (USER CHAT CHECK) & GET RECEIVER INFO
        const ucc = await prisma.chat.findFirst({
            where: {
                id: chatId,
                users: {
                    some: { id: userId }
                }
            },
            include: {
                users: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarUrl: true
                    }
                }
            }
        });
        if (!ucc) {
            return res.status(404).json({ error: "You're not part of this chat, back off!" });
        }

        // EXTRACT RECEIVER
        const receiver = ucc.users.find(user => user.id !== userId);
        if (!receiver) {
            return res.status(500).json({ error: "Receiver not found in chat." });
        }

        // FETCH MESSAGES
        const message = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
        });

        res.json({
            message,
            receiver: {
                id: receiver.id,
                username: receiver.username,
                name: receiver.name,
                avatarUrl: receiver.avatarUrl ?? undefined
            }
        });

    } catch (error) {
        next(error);
    }
}