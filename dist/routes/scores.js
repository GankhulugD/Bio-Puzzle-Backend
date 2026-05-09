"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const userActivity_1 = require("../lib/userActivity");
const router = (0, express_1.Router)();
router.get("/leaderboard/:levelId", async (req, res) => {
    try {
        const scores = await prisma_1.prisma.score.findMany({
            where: { levelId: Number(req.params.levelId) },
            orderBy: [{ points: "desc" }, { timeSeconds: "asc" }],
            take: 10,
            include: { user: { select: { username: true } } },
        });
        res.json(scores);
    }
    catch (e) {
        console.error("GET /scores/leaderboard", e);
        res.status(500).json({ error: "Failed to load leaderboard" });
    }
});
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const scores = await prisma_1.prisma.score.findMany({
            where: { userId: req.userId },
            include: { level: true },
            orderBy: { completedAt: "desc" },
        });
        res.json(scores);
    }
    catch (e) {
        console.error("GET /scores/me", e);
        res.status(500).json({ error: "Failed to load scores" });
    }
});
/** Шилдэг оноо/цагийг нэг мөрөөр хадгална (хэрэглэгч тутамд level тус бүрээр нэг л мөр). */
router.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const levelId = Number(req.body.levelId);
        const points = Number(req.body.points);
        const timeSeconds = Number(req.body.timeSeconds);
        if (!Number.isFinite(levelId) ||
            levelId < 1 ||
            !Number.isFinite(points) ||
            points < 0 ||
            !Number.isFinite(timeSeconds) ||
            timeSeconds < 0) {
            res.status(400).json({ error: "Invalid data" });
            return;
        }
        const userId = req.userId;
        const existing = await prisma_1.prisma.score.findUnique({
            where: { userId_levelId: { userId, levelId } },
        });
        let improvementPoints = 0;
        let created = false;
        if (!existing) {
            improvementPoints = points;
            created = true;
            await prisma_1.prisma.score.create({
                data: { userId, levelId, points, timeSeconds },
            });
        }
        else {
            const betterPoints = points > existing.points;
            const tieFaster = points === existing.points && timeSeconds < existing.timeSeconds;
            if (betterPoints) {
                improvementPoints = points - existing.points;
                await prisma_1.prisma.score.update({
                    where: { userId_levelId: { userId, levelId } },
                    data: { points, timeSeconds, completedAt: new Date() },
                });
            }
            else if (tieFaster) {
                await prisma_1.prisma.score.update({
                    where: { userId_levelId: { userId, levelId } },
                    data: { timeSeconds, completedAt: new Date() },
                });
            }
        }
        let user = null;
        if (improvementPoints > 0) {
            user = await (0, userActivity_1.applyPointsAndStreak)(userId, improvementPoints);
        }
        const scoreRow = await prisma_1.prisma.score.findUnique({
            where: { userId_levelId: { userId, levelId } },
        });
        res.status(created ? 201 : 200).json({ score: scoreRow, user });
    }
    catch (e) {
        console.error("POST /scores", e);
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
