import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/jwt.service";

// INTERFACE FOR AUTH REQUEST
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
};

// AUTH MIDDLEWARE TO PROTECT ROUTES.
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    // GET AUTH HEADER
    const authHeader = req.headers.authorization;

    // CHECK FOR BEARER TOKEN IN THE AUTHORIZATION HEADER
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or Invalid Authorization Header.' });
    }

    // EXTRACT TOKEN FROM HEADER.
    const token = authHeader.split(' ')[1];

    try {
        // CHECK IF THE TOKEN EXISTS.
        if (!token) {
            return res.status(401).json({ message: 'Invalid or Missing Token.' });
        }

        // VERIFY TOKEN AND ATTACH PAYLOAD TO REQ.USER
        const payload = verifyToken(token);

        req.user = {
            id: payload.id,
            email: payload.email
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(401).json({ message: 'Invalid or Expired Token.' });
    }
};