"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const publicSelect = {
    id: true,
    username: true,
    email: true,
    streak: true,
    age: true,
    createdAt: true,
};
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: publicSelect,
        });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (err) {
        console.error("GET /users/me error", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.patch("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const { username, age } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id: req.userId },
            data: {
                ...(username !== undefined && { username }),
                ...(age !== undefined && { age }),
            },
            select: {
                id: true,
                username: true,
                email: true,
                age: true,
                streak: true,
            },
        });
        res.json(user);
    }
    catch {
        res.status(500).json({ error: "Internal server error" });
    }
});
router.delete("/me", auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.prisma.user.delete({ where: { id: req.userId } });
        res.json({ message: "User deleted" });
    }
    catch {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
