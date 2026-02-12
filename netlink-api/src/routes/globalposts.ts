import { Router } from "express";
import { getGlobalPosts } from "../controllers/globalposts.controller";

const router = Router();

router.get("/", getGlobalPosts);

export default router;