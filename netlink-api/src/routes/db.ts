import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

router.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "OK", message: "NETLINK DATABASE CONNECTION SUCCESSFUL" });
    } catch (error){
        console.error(error);
        res.status(500).json({ status: "ERROR", message: "DATABASE CONNECTION FAILED" });
    }
});

export default router;