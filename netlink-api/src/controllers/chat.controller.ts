import { Request, Response, NextFunction } from "express";
import type { Prisma } from '../config/generated/client';
import { prisma } from '../config/prisma';

function getAuthenticatedUserId(req: Request) {
    const userId = (req as any).user?.id;
    return typeof userId === 'string' ? userId : null;
}

async function shouldPermanentlyDeleteChat(tx: Prisma.TransactionClient, chatId: string) {
    const chat = await tx.chat.findUnique({
        where: { id: chatId },
        select: {
            _count: {
                select: {
                    participants: true,
                    hiddenBy: true
                }
            }
        }
    });

    if (!chat) {
        return false;
    }

    return chat._count.participants > 0 && chat._count.hiddenBy >= chat._count.participants;
}

// NEW CHAT
export async function createChat(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId } = req.body;
        const currentUserId = getAuthenticatedUserId(req);

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        if (!currentUserId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const chat = await prisma.chat.create({
            data: {
                participants: {
                    create: [
                        {
                            user: {
                                connect: { id: currentUserId }
                            }
                        },
                        {
                            user: {
                                connect: { id: userId }
                            }
                        }
                    ]
                },
            },
            include: {
                participants: true
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
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const chats = await prisma.chat.findMany({
            where: {
                participants: {
                    some: { userId }
                },
                hiddenBy: {
                    none: { userId }
                }
            },
            include: {
                participants: {
                    select: {
                        userId: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatarUrl: true
                            }
                        }
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
                const receiverParticipant = chat.participants.find(participant => participant.userId !== userId);

                if (!receiverParticipant) {
                    return null;
                }

                const receiver = receiverParticipant.user;

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
        const senderId = getAuthenticatedUserId(req);

        if (!chatId || typeof chatId !== 'string') {
            return res.status(400).json({ error: 'Invalid chat ID.' });
        }

        if (!senderId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                participants: {
                    some: { userId: senderId }
                },
                hiddenBy: {
                    none: { userId: senderId }
                }
            }
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found.' });
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
        const userId = getAuthenticatedUserId(req);

        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required.' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        // UCC (USER CHAT CHECK) & GET RECEIVER INFO
        const ucc = await prisma.chat.findFirst({
            where: {
                id: chatId,
                participants: {
                    some: { userId }
                },
                hiddenBy: {
                    none: { userId }
                }
            },
            include: {
                participants: {
                    select: {
                        userId: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatarUrl: true,
                                createdAt: true
                            }
                        }
                    }
                }
            }
        });
        if (!ucc) {
            return res.status(404).json({ error: "You're not part of this chat, back off!" });
        }

        // EXTRACT RECEIVER
        const receiverParticipant = ucc.participants.find(participant => participant.userId !== userId);
        if (!receiverParticipant) {
            return res.status(500).json({ error: "Receiver not found in chat." });
        }

        const receiver = receiverParticipant.user;

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
                avatarUrl: receiver.avatarUrl ?? undefined,
                createdAt: receiver.createdAt
            }
        });

    } catch (error) {
        next(error);
    }
}

// DELETE CHAT
export async function deleteChat(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = getAuthenticatedUserId(req);
        const chatId = req.params.id;

        if (!userId) {
            return res.status(401).json({
                error: 'Authentication required.'
            });
        }

        if (!chatId || typeof chatId !== 'string') {
            return res.status(400).json({
                error: 'Valid chat ID is required.'
            });
        }

        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                participants: {
                    some: { userId }
                }
            }
        });

        if (!chat) {
            return res.status(403).json({
                error: 'Not authorized to delete this chat.'
            });
        }

        const wasFullyDeleted = await prisma.$transaction(async (tx) => {
            // Hide the shared chat only for the current user.
            await tx.chatHidden.upsert({
                where: {
                    chatId_userId: {
                        chatId,
                        userId
                    }
                },
                create: {
                    chatId,
                    userId
                },
                update: {}
            });

            const mustDeleteForEveryone = await shouldPermanentlyDeleteChat(tx, chatId);
            if (!mustDeleteForEveryone) {
                return false;
            }

            await tx.message.deleteMany({
                where: { chatId }
            });

            await tx.chat.delete({
                where: { id: chatId }
            });

            return true;
        });

        res.json({ success: true, hidden: !wasFullyDeleted, deletedForEveryone: wasFullyDeleted });
    } catch (error) {
        next(error);
    }
}