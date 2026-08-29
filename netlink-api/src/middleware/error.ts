import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

/**=============================================== **/
/** HANDLE PRISMA DB ERRORS + MAP THEM TO AppError **/
/**=============================================== **/
function handlePrismaError(err: any): AppError | null {
    // P2002 | Unique constraint failed
    if (err.code === 'P2002') {
        const field = err.meta?.target ? ` (${err.meta.target})` : '';
        return new AppError(`A record with this field already exists${field}.`, 409);
    }
    // P2025 | Record not found
    if (err.code === 'P2025') {
        return new AppError('The requested record was not found.', 404);
    }
    return null;
}

/**======================= **/
/** HANDLE JWT AUTH ERRORS **/
/**======================= **/
function handleJwtError(err: any): AppError | null {
    if (err.name === 'JsonWebTokenError') {
        return new AppError('Invalid token. Please authenticate again.', 401);
    }
    if (err.name === 'TokenExpiredError') {
        return new AppError('Your token has expired. Please log in again.', 401);
    }
    return null;
}

/**========================**/
/** DEV | PROD ENVIRONMENT **/
/**==========...==============**/
function sendErrorDev(err: any, res: Response) {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    return res.status(statusCode).json({
        status,
        error: err.message,
        statusCode,
        stack: err.stack,
        details: err
    });
}
function sendErrorProd(err: any, res: Response) {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    // 1. Operational, trusted error | send message to client
    if (err.isOperational) {
        return res.status(statusCode).json({
            status,
            error: err.message
        });
    }

    // 2. Programming or unknown error --> don't leak error details
    console.error('ERROR [Unhandled Exception]:', err);

    return res.status(500).json({
        status: 'error',
        error: 'Internal Server Error.'
    });
}

/**====================================**/
/** CENTRALIZED EXPRESS ERROR HANDLING **/
/**====================================**/
export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    let error = err;

    // Handle Malformed JSON payload
    if (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
        error = new AppError('Malformed JSON payload in request body.', 400);
    }

    // Handle known Prisma errors
    const prismaError = handlePrismaError(error);
    if (prismaError) {
        error = prismaError;
    }

    // Handle JWT errors
    const jwtError = handleJwtError(error);
    if (jwtError) {
        error = jwtError;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        sendErrorProd(error, res);
    } else {
        sendErrorDev(error, res);
    }
}