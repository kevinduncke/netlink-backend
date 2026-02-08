import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// LOGIN ROUTE
router.post('/login', login);

// REGISTER ROUTE
router.post('/register', register);

export default router;