import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createChat, getChatMessages, getUserChats, newMessage, deleteChat, getUnreadMessagesCount } from "../controllers/chat.controller";

const router = Router();

// USER CHAT
router.get('/', authenticate, getUserChats);
router.post('/new', authenticate, createChat);
router.get('/messages/unread-count', authenticate, getUnreadMessagesCount);
router.delete('/:id', authenticate, deleteChat);
router.post('/:id/new', authenticate, newMessage);
router.get('/:id/messages', authenticate, getChatMessages);

export default router;