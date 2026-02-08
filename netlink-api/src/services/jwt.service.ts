import jwt from 'jsonwebtoken';

// JWT SECRET KEY AND TOKEN EXPIRATION TIME.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '1h';

// STRUCTURE OF THE JWT PAYLOAD.
export interface JWTPayload {
    id: string;
    email: string;
};

// SIGN A NEW JWT TOKEN.
export const signToken = (payload: JWTPayload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// VERIFY AND DECODE THE JWT TOKEN RING.
export const verifyToken = (token: string): JWTPayload => {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
};