"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPointsAndStreak = applyPointsAndStreak;
const prisma_1 = require("./prisma");
const streak_1 = require("./streak");
const userLevel_1 = require("./userLevel");
const userSummarySelect = {
    id: true,
    email: true,
    username: true,
    displayNameMn: true,
    streak: true,
    age: true,
    createdAt: true,
    totalPoints: true,
    level: true,
    gamesPlayed: true,
    lastActiveDay: true,
};
/**
 * Оноо нэмэж, streak / үе / тоглолтын тоог шинэчилнө (хадгалсан хэрэглэгчийн snapshot буцаана).
 */
async function applyPointsAndStreak(userId, pointsDelta) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            streak: true,
            lastActiveDay: true,
            totalPoints: true,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    const today = (0, streak_1.utcDayString)();
    const { streak, lastActiveDay } = (0, streak_1.computeNextStreak)(user.streak, user.lastActiveDay, today);
    const totalPoints = Math.max(0, user.totalPoints + pointsDelta);
    const level = (0, userLevel_1.pointsToLevel)(totalPoints);
    return prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            totalPoints,
            level,
            streak,
            lastActiveDay,
            gamesPlayed: { increment: 1 },
        },
        select: userSummarySelect,
    });
}
