import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/jwt.service";
import { UnauthorizedError } from "../utils/errors";

// INTERFACE FOR AUTH REQUEST
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

// AUTH MIDDLEWARE TO PROTECT ROUTES.
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    // GET AUTH HEADER
    const authHeader = req.headers.authorization;

    // CHECK FOR BEARER TOKEN IN THE AUTHORIZATION HEADER
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Authorization Header Missing or Invalid.'));
    }

    // EXTRACT TOKEN FROM HEADER.
    const token = authHeader.split(' ')[1];

    if (!token) {
        return next(new UnauthorizedError('Authorization Token Invalid or Missing.'));
    }

    try {
        // VERIFY TOKEN AND ATTACH PAYLOAD TO REQ.USER
        const payload = verifyToken(token);

        // ATTACH USER INFO TO REQUEST OBJECT FOR USE IN CONTROLLERS
        req.user = {
            id: payload.id,
            email: payload.email
        };

        next();
    } catch (err) {
        return next(new UnauthorizedError('Invalid or Expired Token.'));
    }
};