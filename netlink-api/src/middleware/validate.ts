import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

/** ---------------------------------------------------------------------------------------------
 * Express Middleware to validate request body against a Zod schema.
 * 
 * On success --> sanitizes req.body with parsed/defaulted data and calls next().
 * On failure ----> formats field-level validation errors and passes BadRequestError to next().
   --------------------------------------------------------------------------------------------*/

export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const zodError = result.error as ZodError;

            // Extract structured field-level errors
            const formattedErrors = zodError.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message
            }));

            // Create a concise summary message
            const summaryMessage = formattedErrors
                .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
                .join('; ');

            return next(new BadRequestError(summaryMessage, formattedErrors));
        }

        // Assign sanitized and defaulted data back to req.body
        req.body = result.data;
        next();
    };
};