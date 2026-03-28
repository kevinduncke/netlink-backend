import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';

const SALT_ROUNDS = 10;

// HASH A PLAIN PASSWORD.
export const hashPassword = async (password: string) => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

// COMPARE PLAIN PASSWORD WITH HASHED PASSWORD.
export const comparePassword = async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
};

// CREATE A NEW USER.
export const createUser = async (email: string, password: string, name: string, bio: string, avatarUrl: string) => {
    console.log('DATA: ', email, password);

    // CONCATENATE THE NAME AND LASTNAME TO CREATE A USERNAME
    const username = name.toLowerCase().replace(/\s+/g, '');

    return prisma.user.create({
        data: {
            email,
            password,
            name,
            username,
            bio,
            avatarUrl,
        },
    });
};

// FIND A USER BY EMAIL.
export const findUserByEmail = (email: string) => {
    return prisma.user.findUnique({
        where: { email },
    });
};