import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createChat, getChatMessages, getUserChats, newMessage } from "../controllers/chat.controller";

const router = Router();

// USER CHAT
router.get('/', authenticate, getUserChats);
router.post('/new', authenticate, createChat);
router.post('/:id/new', authenticate, newMessage);
router.get('/:id/messages', authenticate, getChatMessages);

export default router;