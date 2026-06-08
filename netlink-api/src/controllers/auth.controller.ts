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
        const emailPattern = /^[a-zA-Z0-9._%+-]+@netlink\.local$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
        }
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid login credentials.' });
        }

        // CHECK PASSWORD
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;;
        if (!passwordPattern.test(password)) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
        }
        const passCheck = await comparePassword(password, user.password);
        if (!passCheck) {
            return res.status(401).json({ error: 'Invalid login credentials.' });
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
        console.error('REGISTER ERROR', err);
        return res.status(500).json({ error: 'Internal Server Error.' });
    }
};

// REGISTER CONTROLLER.
export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, name, password } = req.body;

        // DEFAULT VALUES FOR OPTIONAL FIELDS.
        const bio = req.body.bio || '';
        const avatarUrl = req.body.avatarUrl || '';

        // CHECK IF EMAIL AND PASSWORD ARE PROVIDED.
        if (!email || !name || !password) {
            return res.status(400).json({ error: 'Email, Name and Password are Required!' });
        }

        // CHECK IF USER ALREADY EXISTS
        const emailPattern = /^[a-zA-Z0-9._%+-]+@netlink\.local$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
        }        
        const userCheck = await findUserByEmail(email);
        if (userCheck) {
            return res.status(409).json({ error: 'Email already exists.' });
        }

        // CHECK NAME
        const namePattern = /^[A-Za-zÀ-ÿ ]{2,40}$/;
        if (!namePattern.test(name)) {
        return res.status(400).json({ error: "Invalid name format" });
        }        

        // CHECK PASSWORD
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;;
        if (!passwordPattern.test(password)) {
            return res.status(400).json({ error: 'Invalid login credentials.' });
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
    } catch (error) {
        console.error('REGISTER ERROR: ', error);
        return res.status(500).json({ error: 'Internal Server Error!' });
    }
};