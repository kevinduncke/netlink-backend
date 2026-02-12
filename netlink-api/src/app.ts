import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/error';

// FOR TEST..
import { prisma } from './config/prisma';
import { signToken, verifyToken } from './services/jwt.service';
import { authenticate } from './middleware/auth.middleware';

dotenv.config();

export const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(errorHandler);

    // EXPRESS TEST ROUTE
    app.get('/health', (req, res) => {
        res.json({
            status: 'OK',
            message: 'APP SERVER CONNECTION SUCCESS',
            timestamp: new Date().toISOString()
        });
    });

    // DATABASE TEST ROUTE
    app.get('/db-test', async (req: Request, res: Response) => {
        const users = await prisma.user.findMany();
        res.json({ count: users.length, users: users[0] });
    });

    // JSON WEB TOKEN TEST ROUTE
    app.get('/jwt-test', (req: Request, res: Response) => {
        const token = signToken({ id: '12', email: 'test' });
        const decoded = verifyToken(token);
        res.json({ token, decoded });
    });

    // AUTH MIDDLEWARE TEST ROUTE
    app.get('/protected-test', authenticate, (req: Request, res: Response) => {
        res.json({ ok: true, user: (req as any).user });
    });

    // REGISTER ROUTES
    registerRoutes(app);

    return app;
};