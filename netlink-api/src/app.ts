import express from 'express';
import helmet from 'helmet';
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

    app.use(
        helmet({
            // HTTP STRICT TRANSPORT SECURITY (HSTS)
            strictTransportSecurity: {
                maxAge: 31536000, // 1 year in seconds
                includeSubDomains: true,
                preload: true
            },
            // CONTENT SECURITY POLICY (CSP)
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    "defaultSrc": ["'self'"],
                    "scriptSrc": ["'self'", "'https://trusted-cdn.com'"],
                    "styleSrc": ["'self'", "'unsafe-inline'"],                    
                    "upgrade-insecure-requests": [],
                    "block-all-mixed-content": []
                }
            },
            // X-FRAME-OPTIONS
            xFrameOptions: {
                action: "deny"
            }
        }),
        cors({
            origin: [
                "http://localhost:5173",
                "https://net1ink.netlify.app"
            ],
            credentials: true
        })
    );
    
    app.use(express.json());

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

    // 404 HANDLER (for unmatched routes)
    app.use((req: Request, res: Response) => {
        res.status(404).json({ error: 'Route not found' });
    });

    // ERROR HANDLER (must be after all routes and middleware)
    app.use(errorHandler);

    return app;
};