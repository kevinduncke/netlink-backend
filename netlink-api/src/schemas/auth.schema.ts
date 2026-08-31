import { z } from 'zod';

/**==========================================**/
/** Regex Patterns for Authentication Fields **/
/**==========================================**/
const NAME_REGEX = /^[A-Za-zÀ-ÿ ]{2,40}$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

/**==============================**/
/** USER REGISTRATION ZOD SCHEMA **/
/**==============================**/
export const registerSchema = z.object({
    email: z
        .string({
            required_error: 'Email is required.'
        })
        .trim()
        .toLowerCase()
        .email('Invalid email address format.')
        .max(255, 'Email cannot exceed 255 characters.'),

    name: z
        .string({
            required_error: 'Name is required.'
        })
        .trim()
        .min(2, 'Name must be at least 2 characters long.')
        .max(40, 'Name cannot exceed 40 characters.')
        .regex(NAME_REGEX, 'Name must contain only letters and spaces.'),

    password: z
        .string({
            required_error: 'Password is required.'
        })
        .min(8, 'Password must be at least 8 characters long.')
        .max(128, 'Password cannot exceed 128 characters.')
        .regex(
            PASSWORD_COMPLEXITY_REGEX,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        ),

    bio: z
        .string()
        .trim()
        .max(160, 'Bio cannot exceed 160 characters.')
        .optional(),

    avatarUrl: z
        .string()
        .trim()
        .url('Avatar URL must be a valid URL.')
        .optional()
        .nullable()
        .or(z.literal(''))
});

/**=======================**/
/** USER LOGIN ZOD SCHEMA **/
/**=======================**/
export const loginSchema = z.object({
    email: z
        .string({
            required_error: 'Email is required.'
        })
        .trim()
        .toLowerCase()
        .email('Invalid email address format.'),

    password: z
        .string({
            required_error: 'Password is required.'
        })
        .min(1, 'Password is required.')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;