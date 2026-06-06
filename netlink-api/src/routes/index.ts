import { Express } from "express";
import dbRouter from './db';
import authRouter from './auth';
import userRouter from './user';
import postRouter from './post';
import followRouter from './follow';
import chatRouter from './chats';
import favoriteRouter from './favorite';
import privacyRouter from './privacy';

// Register Routes Paths.
export const registerRoutes = (app: Express) => {
    app.use('/db', dbRouter);
    app.use('/auth', authRouter);
    app.use('/users', userRouter); // +TEST
    app.use('/chats', chatRouter);
    app.use('/post', postRouter);
    app.use('/follow', followRouter);
    app.use('/favorites', favoriteRouter);
    app.use('/privacy', privacyRouter);
};