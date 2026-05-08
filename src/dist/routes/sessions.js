"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/", auth_1.requireAuth, async (req, res) => {
    const sessions = await prisma_1.prisma.gameSession.findMany({
        where: { userId: req.userId },
        include: { level: true },
    });
    res.json(sessions);
});
router.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { levelId, currentState } = req.body;
        const session = await prisma_1.prisma.gameSession.upsert({
            where: { userId_levelId: { userId: req.userId, levelId } },
            update: { currentState, updatedAt: new Date() },
            create: { userId: req.userId, levelId, currentState },
        });
        res.status(201).json(session);
    }
    catch {
        res.status(400).json({ error: "Invalid data" });
    }
});
router.patch("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const sessionId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
        if (!sessionId) {
            res.status(400).json({ error: "Missing id" });
            return;
        }
        const existing = await prisma_1.prisma.gameSession.findFirst({
            where: { id: sessionId, userId: req.userId },
        });
        if (!existing) {
            res.status(404).json({ error: "Session not found" });
            return;
        }
        const { currentState, isCompleted, timeElapsed, moves } = req.body;
        const session = await prisma_1.prisma.gameSession.update({
            where: { id: sessionId },
            data: { currentState, isCompleted, timeElapsed, moves },
        });
        res.json(session);
    }
    catch {
        res.status(404).json({ error: "Session not found" });
    }
});
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const sessionId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
        if (!sessionId) {
            res.status(400).json({ error: "Missing id" });
            return;
        }
        const existing = await prisma_1.prisma.gameSession.findFirst({
            where: { id: sessionId, userId: req.userId },
        });
        if (!existing) {
            res.status(404).json({ error: "Session not found" });
            return;
        }
        await prisma_1.prisma.gameSession.delete({ where: { id: sessionId } });
        res.json({ message: "Session deleted" });
    }
    catch {
        res.status(404).json({ error: "Session not found" });
    }
});
exports.default = router;
