import { Express } from "express";
import dbRouter from './db';
import authRouter from './auth';

// Register Routes Paths.
export const registerRoutes = (app: Express) => {
    app.use('/db', dbRouter);
    app.use('/auth', authRouter);
};