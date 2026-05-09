"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const profileBadges_1 = require("../lib/profileBadges");
const userDto_1 = require("../lib/userDto");
const router = (0, express_1.Router)();
router.get("/me/profile", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                displayNameMn: true,
                streak: true,
                gamesPlayed: true,
                totalPoints: true,
                level: true,
                profileExtras: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const [lessonsCompleted, totalUsers, ahead, skeletonBest, perfectQuiz, toothLessonTotal, toothLessonsDone, chapters,] = await Promise.all([
            prisma_1.prisma.userLessonProgress.count({
                where: { userId, completed: true },
            }),
            prisma_1.prisma.user.count(),
            prisma_1.prisma.user.count({
                where: { totalPoints: { gt: user.totalPoints } },
            }),
            prisma_1.prisma.userQuizBest.findUnique({
                where: {
                    userId_quizKey: { userId, quizKey: "game:skeleton" },
                },
            }),
            prisma_1.prisma.userQuizBest.findFirst({
                where: {
                    userId,
                    quizKey: { startsWith: "chapter:" },
                    score: { gte: 100 },
                },
            }),
            prisma_1.prisma.curriculumLesson.count({ where: { chapterId: "teeth" } }),
            prisma_1.prisma.userLessonProgress.count({
                where: {
                    userId,
                    completed: true,
                    lesson: { chapterId: "teeth" },
                },
            }),
            prisma_1.prisma.chapter.findMany({ select: { id: true } }),
        ]);
        let chaptersFullyCompleted = 0;
        for (const { id: chapterId } of chapters) {
            const [need, done] = await Promise.all([
                prisma_1.prisma.curriculumLesson.count({ where: { chapterId } }),
                prisma_1.prisma.userLessonProgress.count({
                    where: {
                        userId,
                        completed: true,
                        lesson: { chapterId },
                    },
                }),
            ]);
            if (need > 0 && done >= need)
                chaptersFullyCompleted += 1;
        }
        const extras = user.profileExtras &&
            typeof user.profileExtras === "object" &&
            !Array.isArray(user.profileExtras)
            ? user.profileExtras
            : {};
        const character = extras.character;
        const bestTimeSeconds = skeletonBest?.fastestTimeMs != null
            ? Math.round(skeletonBest.fastestTimeMs / 1000)
            : undefined;
        const badges = (0, profileBadges_1.buildProfileBadges)({
            lessonsCompleted,
            gamesPlayed: user.gamesPlayed,
            streak: user.streak,
            toothChapterLessonTotal: toothLessonTotal,
            toothChapterLessonsDone: toothLessonsDone,
            chaptersFullyCompleted,
            totalChapters: chapters.length,
            hasPerfectChapterQuiz: Boolean(perfectQuiz),
        });
        res.json({
            name: user.username,
            nameMn: user.displayNameMn ?? user.username,
            streak: user.streak,
            badges,
            character,
            bestTime: bestTimeSeconds,
            totalGames: user.gamesPlayed,
            lessonsCompleted,
            rank: ahead + 1,
            totalUsers,
            totalPoints: user.totalPoints,
            level: user.level,
        });
    }
    catch (err) {
        console.error("GET /users/me/profile error", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: userDto_1.USER_PUBLIC_SELECT,
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
        const { username, age, displayNameMn, profileExtras } = req.body;
        const existing = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { profileExtras: true },
        });
        let mergedExtras = existing?.profileExtras ?? undefined;
        if (profileExtras !== undefined) {
            if (profileExtras &&
                typeof profileExtras === "object" &&
                !Array.isArray(profileExtras)) {
                const prev = mergedExtras &&
                    typeof mergedExtras === "object" &&
                    !Array.isArray(mergedExtras)
                    ? mergedExtras
                    : {};
                mergedExtras = JSON.parse(JSON.stringify({
                    ...prev,
                    ...profileExtras,
                }));
            }
            else {
                res.status(400).json({ error: "profileExtras must be an object" });
                return;
            }
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: req.userId },
            data: {
                ...(username !== undefined && typeof username === "string"
                    ? { username: username.trim().slice(0, 48) }
                    : {}),
                ...(age !== undefined
                    ? { age: age === null ? null : Number(age) }
                    : {}),
                ...(displayNameMn !== undefined
                    ? {
                        displayNameMn: displayNameMn === null || displayNameMn === ""
                            ? null
                            : String(displayNameMn).trim().slice(0, 80),
                    }
                    : {}),
                ...(mergedExtras !== undefined ? { profileExtras: mergedExtras } : {}),
            },
            select: userDto_1.USER_PUBLIC_SELECT,
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
