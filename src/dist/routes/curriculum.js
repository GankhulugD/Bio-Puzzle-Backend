"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
function mapLesson(row) {
    return {
        id: row.id,
        type: row.type,
        title: row.title,
        titleMn: row.titleMn,
        isUnlocked: row.isUnlocked,
        isCompleted: row.isCompleted,
        question: row.question,
        options: row.options,
        correctAnswer: row.correctAnswer,
        explanation: row.explanation,
        audioText: row.audioText,
        questions: row.questionsJson,
    };
}
/** Нэг дор бүх статик агуулгыг буцаана (frontend CurriculumProvider). */
router.get("/bootstrap", async (_req, res) => {
    try {
        const [chapters, lessons, blobs] = await Promise.all([
            prisma_1.prisma.chapter.findMany({ orderBy: { sortOrder: "asc" } }),
            prisma_1.prisma.curriculumLesson.findMany({
                orderBy: [{ chapterId: "asc" }, { sortOrder: "asc" }],
            }),
            prisma_1.prisma.appContent.findMany(),
        ]);
        const lessonsByChapter = {};
        for (const row of lessons) {
            const list = lessonsByChapter[row.chapterId] ?? [];
            list.push(mapLesson(row));
            lessonsByChapter[row.chapterId] = list;
        }
        const pick = (key) => blobs.find((b) => b.key === key)?.data ?? null;
        res.json({
            chapters,
            lessonsByChapter,
            userProfile: pick("user_profile"),
            leaderboard: pick("leaderboard"),
            teethGameParts: pick("teeth_game_parts"),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load curriculum" });
    }
});
router.get("/chapters", async (_req, res) => {
    try {
        const rows = await prisma_1.prisma.chapter.findMany({
            orderBy: { sortOrder: "asc" },
        });
        res.json(rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load chapters" });
    }
});
router.get("/chapters/:chapterId/lessons", async (req, res) => {
    try {
        const { chapterId } = req.params;
        const rows = await prisma_1.prisma.curriculumLesson.findMany({
            where: { chapterId },
            orderBy: { sortOrder: "asc" },
        });
        res.json(rows.map(mapLesson));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load lessons" });
    }
});
exports.default = router;
