import { z } from 'zod';

/**
 * Post Creation Zod Schema
 */
export const createPostSchema = z
    .object({
        content: z
            .string({
                required_error: 'Content is required.'
            })
            .trim()
            .min(1, 'Content cannot be empty.')
            .max(2000, 'Content cannot exceed 2000 characters.'),

        visibility: z
            .enum(['PUBLIC', 'FOLLOWERS', 'ONLY_ME', 'SPECIFIC'])
            .default('PUBLIC'),

        location: z
            .string()
            .trim()
            .max(100, 'Location cannot exceed 100 characters.')
            .optional()
            .nullable(),

        imageUrl: z
            .string()
            .trim()
            .url('Image URL must be a valid URL.')
            .optional()
            .nullable(),

        hideLikes: z
            .boolean()
            .optional()
            .default(false),

        disableComments: z
            .boolean()
            .optional()
            .default(false),

        mentions: z
            .array(
                z.object({
                    username: z.string().trim()
                })
            )
            .optional(),

        specificFollowers: z
            .array(z.string().trim())
            .optional()
    })
    .superRefine((data, ctx) => {
        // VISIBILITY === SPECIFIC, REQ ONE USER ID
        if (data.visibility === 'SPECIFIC') {
            if (!data.specificFollowers || data.specificFollowers.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'When visibility is SPECIFIC, at least one follower ID must be provided.',
                    path: ['specificFollowers']
                });
            }
        }
    });


export type CreatePostInput = z.infer<typeof createPostSchema>;