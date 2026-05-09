import { Router, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { buildProfileBadges } from "../lib/profileBadges";
import { USER_PUBLIC_SELECT } from "../lib/userDto";

const router = Router();

router.get("/me/profile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
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

    const [
      lessonsCompleted,
      totalUsers,
      ahead,
      skeletonBest,
      perfectQuiz,
      toothLessonTotal,
      toothLessonsDone,
      chapters,
    ] = await Promise.all([
      prisma.userLessonProgress.count({
        where: { userId, completed: true },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: { totalPoints: { gt: user.totalPoints } },
      }),
      prisma.userQuizBest.findUnique({
        where: {
          userId_quizKey: { userId, quizKey: "game:skeleton" },
        },
      }),
      prisma.userQuizBest.findFirst({
        where: {
          userId,
          quizKey: { startsWith: "chapter:" },
          score: { gte: 100 },
        },
      }),
      prisma.curriculumLesson.count({ where: { chapterId: "teeth" } }),
      prisma.userLessonProgress.count({
        where: {
          userId,
          completed: true,
          lesson: { chapterId: "teeth" },
        },
      }),
      prisma.chapter.findMany({ select: { id: true } }),
    ]);

    let chaptersFullyCompleted = 0;
    for (const { id: chapterId } of chapters) {
      const [need, done] = await Promise.all([
        prisma.curriculumLesson.count({ where: { chapterId } }),
        prisma.userLessonProgress.count({
          where: {
            userId,
            completed: true,
            lesson: { chapterId },
          },
        }),
      ]);
      if (need > 0 && done >= need) chaptersFullyCompleted += 1;
    }

    const extras =
      user.profileExtras &&
      typeof user.profileExtras === "object" &&
      !Array.isArray(user.profileExtras)
        ? (user.profileExtras as Record<string, unknown>)
        : {};

    const character = extras.character;

    const bestTimeSeconds =
      skeletonBest?.fastestTimeMs != null
        ? Math.round(skeletonBest.fastestTimeMs / 1000)
        : undefined;

    const badges = buildProfileBadges({
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
  } catch (err) {
    console.error("GET /users/me/profile error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: USER_PUBLIC_SELECT,
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error("GET /users/me error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { username, age, displayNameMn, profileExtras } = req.body as {
      username?: string;
      age?: unknown;
      displayNameMn?: unknown;
      profileExtras?: unknown;
    };

    const existing = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { profileExtras: true },
    });

    let mergedExtras = existing?.profileExtras ?? undefined;
    if (profileExtras !== undefined) {
      if (
        profileExtras &&
        typeof profileExtras === "object" &&
        !Array.isArray(profileExtras)
      ) {
        const prev =
          mergedExtras &&
          typeof mergedExtras === "object" &&
          !Array.isArray(mergedExtras)
            ? (mergedExtras as Record<string, unknown>)
            : {};
        mergedExtras = JSON.parse(
          JSON.stringify({
            ...prev,
            ...(profileExtras as Record<string, unknown>),
          }),
        ) as Prisma.JsonObject;
      } else {
        res.status(400).json({ error: "profileExtras must be an object" });
        return;
      }
    }

    const user = await prisma.user.update({
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
              displayNameMn:
                displayNameMn === null || displayNameMn === ""
                  ? null
                  : String(displayNameMn).trim().slice(0, 80),
            }
          : {}),
        ...(mergedExtras !== undefined ? { profileExtras: mergedExtras } : {}),
      },
      select: USER_PUBLIC_SELECT,
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
