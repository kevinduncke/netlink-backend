import { NextFunction, Request, Response } from 'express';
import { comparePassword, findUserByEmail, hashPassword, createUser } from '../services/auth.service';
import { signToken } from '../services/jwt.service';

// LOGIN CONTROLLER.
export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        // CHECK IF EMAIL AND PASSWORD ARE PROVIDED.
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and Password are required!.' });
        }

        // CHECK IF USER ALREADY EXISTS.
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid Email!' });
        }

        // CHECK PASSWORD
        const passCheck = await comparePassword(password, user.password);
        if (!passCheck) {
            return res.status(401).json({ message: 'Invalid Password!' });
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
                email: user.email,
            },
        });
    } catch (err) {
        console.error('REGISTER ERROR', err);
        return res.status(500).json({ message: 'Internal Server Error.' });
    }
};

// REGISTER CONTROLLER.
export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;

        // DEFAULT VALUES
        const name = '';
        const bio = '';
        const avatarUrl = '';

        // CHECK IF EMAIL AND PASSWORD ARE PROVIDED.
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and Password are Required!' });
        }

        // CHECK IF USER ALREADY EXISTS
        const userCheck = await findUserByEmail(email);
        console.log('-------------------------');
        console.log(email);
        if (userCheck) {
            return res.status(409).json({ message: 'Email already exists.' });
        }

        // CALL TO HASH THE PASSWORD
        const hashed = await hashPassword(password);
        console.log(hashed);
        console.log('-------------------------');
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
    } catch (error) {
        console.error('REGISTER ERROR: ', error);
        return res.status(500).json({ error: 'Internal Server Error!' });
    }
};