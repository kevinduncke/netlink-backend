/** BASE APPLICATION ERROR **/
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly status: 'fail' | 'error';
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

/** [400] Bad Request **/
/** Input validation fails, missing required fields, or malformed data.*/
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request.') {
        super(message, 400);
    }
}

/** [401] Unauthorized **/
/** Authentication is missing, invalid token, or bad login credentials. **/
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized.') {
        super(message, 401);
    }
}

/** [403] Forbidden **/
/** User is authenticated but does not have permission for the action.**/
export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden.') {
        super(message, 403);
    }
}

/** [404] Not Found **/
/** Requested resource (user, post, comment) or route is not found. **/
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found.') {
        super(message, 404);
    }
}

/** [409] Conflict **/
/** Resource already exists. **/
export class ConflictError extends AppError {
    constructor(message: string = 'Conflict: Resource already exists.') {
        super(message, 409);
    }
}

/** [500] Internal Server Error **/
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error.') {
        super(message, 500, false);
    }
}
