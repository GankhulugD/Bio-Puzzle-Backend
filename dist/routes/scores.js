"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/leaderboard/:levelId", async (req, res) => {
    const scores = await prisma_1.prisma.score.findMany({
        where: { levelId: Number(req.params.levelId) },
        orderBy: { points: "desc" },
        take: 10,
        include: { user: { select: { username: true } } },
    });
    res.json(scores);
});
router.get("/me", auth_1.requireAuth, async (req, res) => {
    const scores = await prisma_1.prisma.score.findMany({
        where: { userId: req.userId },
        include: { level: true },
        orderBy: { completedAt: "desc" },
    });
    res.json(scores);
});
router.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { levelId, points, timeSeconds } = req.body;
        const score = await prisma_1.prisma.score.create({
            data: { userId: req.userId, levelId, points, timeSeconds },
        });
        res.status(201).json(score);
    }
    catch {
        res.status(400).json({ error: "Invalid data" });
    }
});
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const scoreId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
        if (!scoreId) {
            res.status(400).json({ error: "Missing id" });
            return;
        }
        const owned = await prisma_1.prisma.score.findFirst({
            where: { id: scoreId, userId: req.userId },
        });
        if (!owned) {
            res.status(404).json({ error: "Score not found" });
            return;
        }
        await prisma_1.prisma.score.delete({ where: { id: scoreId } });
        res.json({ message: "Score deleted" });
    }
    catch {
        res.status(404).json({ error: "Score not found" });
    }
});
exports.default = router;
