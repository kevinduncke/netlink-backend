import { NextFunction, Request, Response } from 'express';
import { comparePassword, findUserByEmail, hashPassword, createUser } from '../services/auth.service';
import { signToken } from '../services/jwt.service';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors';

// LOGIN CONTROLLER
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;

        // CHECK IF EMAIL AND PASSWORD ARE PROVIDED
        if (!email || !password) {
            throw new BadRequestError('Email and Password are required.');
        }

        // VALIDATE EMAIL FORMAT
        const emailPattern = /^[a-zA-Z0-9._%+-]+@netlink\.local$/;
        if (!emailPattern.test(email)) {
            throw new UnauthorizedError('Invalid login credentials.');
        }

        const user = await findUserByEmail(email);
        if (!user) {
            throw new UnauthorizedError('Invalid login credentials.');
        }

        // CHECK PASSWORD FORMAT & VERIFY HASH
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordPattern.test(password)) {
            throw new UnauthorizedError('Invalid login credentials.');
        }

        const passCheck = await comparePassword(password, user.password);
        if (!passCheck) {
            throw new UnauthorizedError('Invalid login credentials.');
        }

        // SIGN JWT TOKEN
        const token = signToken({
            id: user.id,
            email: user.email,
        });

        // RETURN SIGNED JWT TOKEN + USER INFO
        return res.json({
            accessToken: token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,                
                email: user.email,
            },
        });
    } catch (err) {
        next(err);
    }
}

// REGISTER CONTROLLER
export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, name, password } = req.body;

        // DEFAULT VALUES FOR OPTIONAL FIELDS
        const bio = req.body.bio || '';
        const avatarUrl = req.body.avatarUrl || '';

        // CHECK REQUIRED FIELDS
        if (!email || !name || !password) {
            throw new BadRequestError('Email, Name and Password are Required.');
        }

        // VALIDATE EMAIL
        const emailPattern = /^[a-zA-Z0-9._%+-]+@netlink\.local$/;
        if (!emailPattern.test(email)) {
            throw new BadRequestError('Invalid email format. Must end with @netlink.local.');
        }

        const userCheck = await findUserByEmail(email);
        if (userCheck) {
            throw new ConflictError('Email already exists.');
        }

        // CHECK NAME
        const namePattern = /^[A-Za-zÀ-ÿ ]{2,40}$/;
        if (!namePattern.test(name)) {
            throw new BadRequestError('Invalid name format.');
        }

        // CHECK PASSWORD
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordPattern.test(password)) {
            throw new BadRequestError('Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and symbols.');
        }

        // CALL TO HASH THE PASSWORD
        const hashed = await hashPassword(password);
        
        // CALL TO CREATE NEW USER
        const user = await createUser(email, hashed, name, bio, avatarUrl);

        return res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                bio: user.bio,
                avatarUrl: user.avatarUrl,
            }
        });
    } catch (err) {
        next(err);
    }
}