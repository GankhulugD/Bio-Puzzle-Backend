"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const userActivity_1 = require("../lib/userActivity");
const router = (0, express_1.Router)();
function quizKeyForGame(gameKey) {
    return `game:${gameKey}`;
}
/** Бүлгийн асуултаас буцаж ирэхэд — бүх хичээлийг дуусгасан гэж үзнэ (quiz бүх асуултыг агуулдаг). */
router.post("/chapter-quiz", auth_1.requireAuth, async (req, res) => {
    try {
        const { chapterId, correctCount, totalCount } = req.body;
        if (!chapterId || typeof chapterId !== "string") {
            res.status(400).json({ error: "chapterId required" });
            return;
        }
        const correct = Number(correctCount);
        const total = Number(totalCount);
        if (!Number.isFinite(correct) ||
            !Number.isFinite(total) ||
            total <= 0 ||
            correct < 0) {
            res.status(400).json({ error: "valid correctCount and totalCount required" });
            return;
        }
        const lessonRows = await prisma_1.prisma.curriculumLesson.findMany({
            where: { chapterId },
            select: { id: true },
        });
        if (lessonRows.length === 0) {
            res.status(404).json({ error: "Chapter not found" });
            return;
        }
        const stars = Math.min(3, Math.max(0, Math.round((correct / total) * 3)));
        const pointsDelta = Math.round(correct * 10);
        const pct = Math.round((100 * correct) / total);
        const userId = req.userId;
        await prisma_1.prisma.$transaction(async (tx) => {
            for (const { id: lessonId } of lessonRows) {
                const existing = await tx.userLessonProgress.findUnique({
                    where: {
                        userId_lessonId: { userId, lessonId },
                    },
                });
                const nextStars = Math.max(existing?.stars ?? 0, stars);
                await tx.userLessonProgress.upsert({
                    where: { userId_lessonId: { userId, lessonId } },
                    create: {
                        userId,
                        lessonId,
                        completed: true,
                        stars: nextStars,
                        attempts: 1,
                        completedAt: new Date(),
                    },
                    update: {
                        completed: true,
                        stars: nextStars,
                        attempts: { increment: 1 },
                        completedAt: new Date(),
                    },
                });
            }
            const key = `chapter:${chapterId}`;
            const prevBest = await tx.userQuizBest.findUnique({
                where: { userId_quizKey: { userId, quizKey: key } },
            });
            await tx.userQuizBest.upsert({
                where: { userId_quizKey: { userId, quizKey: key } },
                create: {
                    userId,
                    quizKey: key,
                    score: pct,
                    correctCount: correct,
                    totalCount: total,
                    attempts: 1,
                },
                update: {
                    score: Math.max(prevBest?.score ?? 0, pct),
                    correctCount: correct,
                    totalCount: total,
                    attempts: { increment: 1 },
                },
            });
        });
        const user = await (0, userActivity_1.applyPointsAndStreak)(userId, pointsDelta);
        res.status(201).json({
            user,
            pointsEarned: pointsDelta,
            lessonsUpdated: lessonRows.length,
        });
    }
    catch (e) {
        console.error("POST /progress/chapter-quiz", e);
        res.status(500).json({ error: "Failed to save progress" });
    }
});
/** Жижиг тоглоом (шүд, яс гэх мэт) — UserQuizBest + оноо. */
router.post("/mini-game", auth_1.requireAuth, async (req, res) => {
    try {
        const body = req.body;
        const allowed = new Set(["tooth-quiz", "tooth-label", "skeleton"]);
        const gameKey = typeof body.gameKey === "string" ? body.gameKey.trim() : "";
        if (!allowed.has(gameKey)) {
            res.status(400).json({ error: "Invalid gameKey" });
            return;
        }
        let pointsDelta = 0;
        let correct = 0;
        let total = 0;
        let fastestMs;
        if (gameKey === "skeleton") {
            const t = Math.max(0, Number(body.timeSeconds) || 0);
            pointsDelta = Math.max(85, 540 - Math.floor(t));
            fastestMs = Math.round(t * 1000);
        }
        else {
            correct = Number(body.correctCount);
            total = Number(body.totalCount);
            if (!Number.isFinite(correct) ||
                !Number.isFinite(total) ||
                total <= 0 ||
                correct < 0) {
                res.status(400).json({ error: "valid correctCount and totalCount required" });
                return;
            }
            pointsDelta = Math.round(correct * 10);
        }
        const userId = req.userId;
        const qKey = quizKeyForGame(gameKey);
        let pct = 0;
        if (gameKey !== "skeleton") {
            pct = Math.round((100 * correct) / total);
        }
        else {
            pct = Math.min(100, Math.round((pointsDelta / 540) * 100));
        }
        const prevGame = await prisma_1.prisma.userQuizBest.findUnique({
            where: { userId_quizKey: { userId, quizKey: qKey } },
        });
        const nextScore = Math.max(prevGame?.score ?? 0, pct);
        const nextFastestMs = gameKey === "skeleton" && fastestMs != null
            ? prevGame?.fastestTimeMs != null
                ? Math.min(prevGame.fastestTimeMs, fastestMs)
                : fastestMs
            : (prevGame?.fastestTimeMs ?? fastestMs ?? null);
        await prisma_1.prisma.userQuizBest.upsert({
            where: { userId_quizKey: { userId, quizKey: qKey } },
            create: {
                userId,
                quizKey: qKey,
                score: pct,
                fastestTimeMs: fastestMs ?? null,
                correctCount: gameKey === "skeleton" ? null : correct,
                totalCount: gameKey === "skeleton" ? null : total,
                attempts: 1,
            },
            update: {
                score: nextScore,
                fastestTimeMs: nextFastestMs,
                ...(gameKey !== "skeleton"
                    ? {
                        correctCount: correct,
                        totalCount: total,
                    }
                    : {}),
                attempts: { increment: 1 },
            },
        });
        const user = await (0, userActivity_1.applyPointsAndStreak)(userId, pointsDelta);
        res.status(201).json({ user, pointsEarned: pointsDelta });
    }
    catch (e) {
        console.error("POST /progress/mini-game", e);
        res.status(500).json({ error: "Failed to save game result" });
    }
});
exports.default = router;
