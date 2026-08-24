import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { authRateLimiter } from "../middleware/rate-limit";

const router = Router();

// LOGIN ROUTE
router.post('/login', authRateLimiter, login);

// REGISTER ROUTE
router.post('/register', authRateLimiter, register);

export default router;