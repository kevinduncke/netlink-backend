import express from 'express';
import helmet from 'helmet';
import { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/error';
import { apiRateLimiter } from './middleware/rate-limit';

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

    // REGISTER ROUTES
    app.use(apiRateLimiter);
    registerRoutes(app);

    // 404 HANDLER (for unmatched routes)
    app.use((req: Request, res: Response) => {
        res.status(404).json({ error: 'Route not found' });
    });

    // ERROR HANDLER (must be after all routes and middleware)
    app.use(errorHandler);

    return app;
};