import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { computeNextStreak, utcDayString } from "./streak";
import { pointsToLevel } from "./userLevel";

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
} as const;

export type UserSummary = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

/**
 * Оноо нэмэж, streak / үе / тоглолтын тоог шинэчилнө (хадгалсан хэрэглэгчийн snapshot буцаана).
 */
export async function applyPointsAndStreak(
  userId: string,
  pointsDelta: number,
): Promise<UserSummary> {
  const user = await prisma.user.findUnique({
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

  const today = utcDayString();
  const { streak, lastActiveDay } = computeNextStreak(
    user.streak,
    user.lastActiveDay,
    today,
  );
  const totalPoints = Math.max(0, user.totalPoints + pointsDelta);
  const level = pointsToLevel(totalPoints);

  return prisma.user.update({
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
