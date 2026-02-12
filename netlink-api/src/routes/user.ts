import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/test", authenticate, (req, res) => {
    res.json({
        authenticated: true,
        user: (req as any).user
    });
});

export default router;