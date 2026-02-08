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
export const createUser = async (email: string, password: string) => {
    console.log('DATA: ', email, password);
    return prisma.user.create({
        data: {
            email,
            password,
        },
    });
};

// FIND A USER BY EMAIL.
export const findUserByEmail = (email: string) => {
    return prisma.user.findUnique({
        where: { email },
    });
};