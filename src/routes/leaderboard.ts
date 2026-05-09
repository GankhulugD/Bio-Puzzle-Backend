import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyJwtUserId } from "../lib/jwt";
import { mapDbOrConfigError } from "../lib/apiErrors";

const router = Router();

function optionalUserId(req: Request): string | undefined {
  const header = req.headers.authorization;
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : null;
  if (!token) return undefined;
  try {
    return verifyJwtUserId(token);
  } catch {
    return undefined;
  }
}

function avatarFromExtras(extras: unknown): string {
  if (!extras || typeof extras !== "object") return "👤";
  const a = (extras as { avatar?: string }).avatar;
  return typeof a === "string" && a.length > 0 ? a : "👤";
}

function characterFromExtras(extras: unknown): unknown {
  if (!extras || typeof extras !== "object") return undefined;
  const c = (extras as { character?: unknown }).character;
  return c && typeof c === "object" ? c : undefined;
}

/** Нийт оноогоор эрэмбэлсэн — цаг нь зөвхөн skeleton тоглоомын жинхэнэ хурд. */
router.get("/global", async (req: Request, res: Response) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(5, rawLimit))
      : 50;

    const currentUserId = optionalUserId(req);

    const [rows, totalUsers] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count(),
    ]);

    const userIds = rows.map((r) => r.id);

    const [skeletonRows, lessonAct, quizAct] =
      userIds.length === 0
        ? [[], [], []]
        : await Promise.all([
            prisma.userQuizBest.findMany({
              where: {
                userId: { in: userIds },
                quizKey: "game:skeleton",
              },
              select: { userId: true, fastestTimeMs: true, updatedAt: true },
            }),
            prisma.userLessonProgress.groupBy({
              by: ["userId"],
              where: { userId: { in: userIds } },
              _max: { updatedAt: true },
            }),
            prisma.userQuizBest.groupBy({
              by: ["userId"],
              where: { userId: { in: userIds } },
              _max: { updatedAt: true },
            }),
          ]);

    const skMap = new Map(
      skeletonRows.map((s) => [
        s.userId,
        {
          sec:
            s.fastestTimeMs != null
              ? Math.max(1, Math.round(s.fastestTimeMs / 1000))
              : null as number | null,
          updatedAt: s.updatedAt,
        },
      ]),
    );

    const lessonActMap = new Map(
      lessonAct.map((x) => [x.userId, x._max.updatedAt]),
    );
    const quizActMap = new Map(
      quizAct.map((x) => [x.userId, x._max.updatedAt]),
    );

    function lastPlayedAt(userId: string): Date {
      const a = lessonActMap.get(userId);
      const b = quizActMap.get(userId);
      const sk = skMap.get(userId)?.updatedAt;
      const dates = [a, b, sk].filter(Boolean) as Date[];
      if (dates.length === 0) return new Date(0);
      return new Date(Math.max(...dates.map((d) => d.getTime())));
    }

    const entries = rows.map((r, i) => {
      const sk = skMap.get(r.id);
      const bestSkeletonSeconds = sk?.sec ?? null;
      const played = lastPlayedAt(r.id);
      const dateIso =
        played.getTime() > 0 ? played.toISOString() : r.createdAt.toISOString();

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
        trend: "same" as const,
        bestSkeletonSeconds,
        date: dateIso,
      };
    });

    let me: {
      rank: number;
      totalPoints: number;
      level: number;
      streak: number;
    } | null = null;

    if (currentUserId) {
      const u = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { totalPoints: true, level: true, streak: true },
      });
      if (u) {
        const ahead = await prisma.user.count({
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
  } catch (e) {
    console.error("GET /leaderboard/global", e);
    res.status(500).json({
      error: mapDbOrConfigError(e, "Жагсаалт ачааллаагүй"),
    });
  }
});

export default router;
