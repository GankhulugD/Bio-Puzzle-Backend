"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
const apiErrors_1 = require("../lib/apiErrors");
const router = (0, express_1.Router)();
function optionalUserId(req) {
    const header = req.headers.authorization;
    const token = typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7).trim()
        : null;
    if (!token)
        return undefined;
    try {
        return (0, jwt_1.verifyJwtUserId)(token);
    }
    catch {
        return undefined;
    }
}
function avatarFromExtras(extras) {
    if (!extras || typeof extras !== "object")
        return "👤";
    const a = extras.avatar;
    return typeof a === "string" && a.length > 0 ? a : "👤";
}
function characterFromExtras(extras) {
    if (!extras || typeof extras !== "object")
        return undefined;
    const c = extras.character;
    return c && typeof c === "object" ? c : undefined;
}
/** Нийт оноогоор эрэмбэлсэн — цаг нь зөвхөн skeleton тоглоомын жинхэнэ хурд. */
router.get("/global", async (req, res) => {
    try {
        const rawLimit = Number(req.query.limit);
        const limit = Number.isFinite(rawLimit)
            ? Math.min(100, Math.max(5, rawLimit))
            : 50;
        const currentUserId = optionalUserId(req);
        const [rows, totalUsers] = await Promise.all([
            prisma_1.prisma.user.findMany({
                orderBy: [{ totalPoints: "desc" }, { streak: "desc" }],
                take: limit,
                select: {
                    id: true,
                    username: true,
                    displayNameMn: true,
                    totalPoints: true,
                    level: true,
                    streak: true,
                    profileExtras: true,
                    createdAt: true,
                },
            }),
            prisma_1.prisma.user.count(),
        ]);
        const userIds = rows.map((r) => r.id);
        const [skeletonRows, lessonAct, quizAct] = userIds.length === 0
            ? [[], [], []]
            : await Promise.all([
                prisma_1.prisma.userQuizBest.findMany({
                    where: {
                        userId: { in: userIds },
                        quizKey: "game:skeleton",
                    },
                    select: { userId: true, fastestTimeMs: true, updatedAt: true },
                }),
                prisma_1.prisma.userLessonProgress.groupBy({
                    by: ["userId"],
                    where: { userId: { in: userIds } },
                    _max: { updatedAt: true },
                }),
                prisma_1.prisma.userQuizBest.groupBy({
                    by: ["userId"],
                    where: { userId: { in: userIds } },
                    _max: { updatedAt: true },
                }),
            ]);
        const skMap = new Map(skeletonRows.map((s) => [
            s.userId,
            {
                sec: s.fastestTimeMs != null
                    ? Math.max(1, Math.round(s.fastestTimeMs / 1000))
                    : null,
                updatedAt: s.updatedAt,
            },
        ]));
        const lessonActMap = new Map(lessonAct.map((x) => [x.userId, x._max.updatedAt]));
        const quizActMap = new Map(quizAct.map((x) => [x.userId, x._max.updatedAt]));
        function lastPlayedAt(userId) {
            const a = lessonActMap.get(userId);
            const b = quizActMap.get(userId);
            const sk = skMap.get(userId)?.updatedAt;
            const dates = [a, b, sk].filter(Boolean);
            if (dates.length === 0)
                return new Date(0);
            return new Date(Math.max(...dates.map((d) => d.getTime())));
        }
        const entries = rows.map((r, i) => {
            const sk = skMap.get(r.id);
            const bestSkeletonSeconds = sk?.sec ?? null;
            const played = lastPlayedAt(r.id);
            const dateIso = played.getTime() > 0 ? played.toISOString() : r.createdAt.toISOString();
            return {
                rank: i + 1,
                userId: r.id,
                name: r.username,
                nameMn: r.displayNameMn ?? r.username,
                avatar: avatarFromExtras(r.profileExtras),
                character: characterFromExtras(r.profileExtras),
                points: r.totalPoints,
                level: r.level,
                streak: r.streak,
                isCurrentUser: currentUserId === r.id,
                trend: "same",
                bestSkeletonSeconds,
                date: dateIso,
            };
        });
        let me = null;
        if (currentUserId) {
            const u = await prisma_1.prisma.user.findUnique({
                where: { id: currentUserId },
                select: { totalPoints: true, level: true, streak: true },
            });
            if (u) {
                const ahead = await prisma_1.prisma.user.count({
                    where: { totalPoints: { gt: u.totalPoints } },
                });
                me = {
                    rank: ahead + 1,
                    totalPoints: u.totalPoints,
                    level: u.level,
                    streak: u.streak,
                };
            }
        }
        res.json({ entries, totalUsers, me });
    }
    catch (e) {
        console.error("GET /leaderboard/global", e);
        res.status(500).json({
            error: (0, apiErrors_1.mapDbOrConfigError)(e, "Жагсаалт ачааллаагүй"),
        });
    }
});
exports.default = router;
