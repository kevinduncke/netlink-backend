import assert from 'assert';
import {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    InternalServerError
} from './errors';
import { errorHandler } from '../middleware/error';
import { Request, Response, NextFunction } from 'express';

function createMockRes() {
    const res: any = {
        statusCode: 200,
        body: null,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(data: any) {
            this.body = data;
            return this;
        }
    };
    return res;
}

const mockReq: any = { method: 'GET', originalUrl: '/test' };
const mockNext: NextFunction = () => {};

console.log('------------------------------------------------------------------------');
console.log('STARTING CENTRALIZED ERROR HANDLING TEST SUITE');
console.log('------------------------------------------------------------------------');

// 1. TEST APPERROR CLASS HIERARCHY
console.log('▶ [1/6] Testing AppError Class & Inheritance...');
{
    const badReq = new BadRequestError('Missing fields');
    assert.strictEqual(badReq.statusCode, 400, 'BadRequestError must be 400');
    assert.strictEqual(badReq.status, 'fail', 'BadRequestError status must be fail');
    assert.strictEqual(badReq.isOperational, true, 'BadRequestError must be operational');
    assert.ok(badReq instanceof AppError, 'Must be instance of AppError');
    assert.ok(badReq instanceof Error, 'Must be instance of Error');

    const unauth = new UnauthorizedError('Invalid token');
    assert.strictEqual(unauth.statusCode, 401, 'UnauthorizedError must be 401');
    assert.strictEqual(unauth.status, 'fail', 'UnauthorizedError status must be fail');

    const forbid = new ForbiddenError('Action not allowed');
    assert.strictEqual(forbid.statusCode, 403, 'ForbiddenError must be 403');

    const notFound = new NotFoundError('User 404');
    assert.strictEqual(notFound.statusCode, 404, 'NotFoundError must be 404');

    const conflict = new ConflictError('Email exists');
    assert.strictEqual(conflict.statusCode, 409, 'ConflictError must be 409');

    const serverErr = new InternalServerError('Fatal DB down');
    assert.strictEqual(serverErr.statusCode, 500, 'InternalServerError must be 500');
    assert.strictEqual(serverErr.status, 'error', 'InternalServerError status must be error');
    assert.strictEqual(serverErr.isOperational, false, 'InternalServerError must NOT be operational');
    console.log('  ✔ AppError hierarchy validated successfully.');
}

// 2. TEST DEVELOPMENT MODE
console.log('▶ [2/6] Testing Development Mode Error Responses...');
{
    process.env.NODE_ENV = 'development';
    const res = createMockRes();
    const error = new NotFoundError('Profile not found');

    errorHandler(error, mockReq, res, mockNext);

    assert.strictEqual(res.statusCode, 404, 'Status must be 404');
    assert.strictEqual(res.body.status, 'fail', 'Status payload must be fail');
    assert.strictEqual(res.body.error, 'Profile not found');
    assert.strictEqual(res.body.statusCode, 404);
    assert.ok(typeof res.body.stack === 'string', 'Stack trace must be present in dev');
    console.log('  ✔ Development response contains stack trace and details.');
}

// 3. TEST PRODUCTION MODE
console.log('▶ [3/6] Testing Production Mode Error Sanitization...');
{
    process.env.NODE_ENV = 'production';
    
    // 3a. Known operational error in production
    const resOp = createMockRes();
    const opError = new UnauthorizedError('Session expired.');
    errorHandler(opError, mockReq, resOp, mockNext);

    assert.strictEqual(resOp.statusCode, 401);
    assert.strictEqual(resOp.body.status, 'fail');
    assert.strictEqual(resOp.body.error, 'Session expired.');
    assert.strictEqual(resOp.body.stack, undefined, 'Stack trace must NEVER be in production');

    // 3b. Unexpected programmer bug in production
    const resBug = createMockRes();
    const bug = new TypeError('Cannot read properties of undefined');
    errorHandler(bug, mockReq, resBug, mockNext);

    assert.strictEqual(resBug.statusCode, 500, 'Unexpected bug must default to 500');
    assert.strictEqual(resBug.body.status, 'error');
    assert.strictEqual(resBug.body.error, 'Internal Server Error.', 'Bug message must be sanitized in production');
    assert.strictEqual(resBug.body.stack, undefined, 'Stack trace must NEVER be in production');
    console.log('  ✔ Production responses sanitized and leak no stack traces.');
}

// 4. TEST PRISMA ERROR MAPPINGS
console.log('▶ [4/6] Testing Prisma Error Mapping...');
{
    process.env.NODE_ENV = 'production';

    // Unique constraint (P2002)
    const resP2002 = createMockRes();
    const prismaP2002 = { code: 'P2002', meta: { target: 'email' }, message: 'Unique constraint' };
    errorHandler(prismaP2002, mockReq, resP2002, mockNext);
    assert.strictEqual(resP2002.statusCode, 409, 'P2002 must map to 409 Conflict');
    assert.strictEqual(resP2002.body.status, 'fail');
    assert.ok(resP2002.body.error.includes('email'), 'Error should mention target field');

    // Record not found (P2025)
    const resP2025 = createMockRes();
    const prismaP2025 = { code: 'P2025', message: 'Record not found' };
    errorHandler(prismaP2025, mockReq, resP2025, mockNext);
    assert.strictEqual(resP2025.statusCode, 404, 'P2025 must map to 404 Not Found');
    console.log('  ✔ Prisma P2002 & P2025 mapped to 409 & 404 successfully.');
}

// 5. TEST JWT & BODY-PARSER ERROR MAPPINGS
console.log('▶ [5/6] Testing JWT & JSON Syntax Error Mapping...');
{
    process.env.NODE_ENV = 'production';

    // JsonWebTokenError
    const resJwt = createMockRes();
    const jwtErr = { name: 'JsonWebTokenError', message: 'jwt malformed' };
    errorHandler(jwtErr, mockReq, resJwt, mockNext);
    assert.strictEqual(resJwt.statusCode, 401, 'JsonWebTokenError must map to 401');

    // TokenExpiredError
    const resExp = createMockRes();
    const expErr = { name: 'TokenExpiredError', message: 'jwt expired' };
    errorHandler(expErr, mockReq, resExp, mockNext);
    assert.strictEqual(resExp.statusCode, 401, 'TokenExpiredError must map to 401');

    // Malformed JSON SyntaxError
    const resSyntax = createMockRes();
    const syntaxErr = new SyntaxError('Unexpected token in JSON');
    (syntaxErr as any).body = '{ bad json }';
    (syntaxErr as any).status = 400;
    errorHandler(syntaxErr, mockReq, resSyntax, mockNext);
    assert.strictEqual(resSyntax.statusCode, 400, 'Malformed JSON must map to 400');
    console.log('  ✔ JWT and Body-Parser Syntax errors mapped successfully.');
}

// 6. TEST APP-LEVEL 404 PIPELINE
console.log('▶ [6/6] Testing Unhandled Route 404 Handler...');
{
    process.env.NODE_ENV = 'production';
    const notFoundError = new NotFoundError('Cannot find POST /api/nonexistent on this server.');
    const res404 = createMockRes();
    errorHandler(notFoundError, mockReq, res404, mockNext);

    assert.strictEqual(res404.statusCode, 404);
    assert.strictEqual(res404.body.status, 'fail');
    assert.strictEqual(res404.body.error, 'Cannot find POST /api/nonexistent on this server.');
    console.log('  ✔ Unhandled 404 route pipeline verified.');
}

console.log('\nALL 6 TEST SUITES PASSED! 0 errors encountered.\n');
