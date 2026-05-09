import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { applyPointsAndStreak } from "../lib/userActivity";

const router = Router();

router.get("/leaderboard/:levelId", async (req: Request, res: Response) => {
  try {
    const scores = await prisma.score.findMany({
      where: { levelId: Number(req.params.levelId) },
      orderBy: [{ points: "desc" }, { timeSeconds: "asc" }],
      take: 10,
      include: { user: { select: { username: true } } },
    });
    res.json(scores);
  } catch (e) {
    console.error("GET /scores/leaderboard", e);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.userId! },
      include: { level: true },
      orderBy: { completedAt: "desc" },
    });
    res.json(scores);
  } catch (e) {
    console.error("GET /scores/me", e);
    res.status(500).json({ error: "Failed to load scores" });
  }
});

/** Шилдэг оноо/цагийг нэг мөрөөр хадгална (хэрэглэгч тутамд level тус бүрээр нэг л мөр). */
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const levelId = Number(req.body.levelId);
    const points = Number(req.body.points);
    const timeSeconds = Number(req.body.timeSeconds);

    if (
      !Number.isFinite(levelId) ||
      levelId < 1 ||
      !Number.isFinite(points) ||
      points < 0 ||
      !Number.isFinite(timeSeconds) ||
      timeSeconds < 0
    ) {
      res.status(400).json({ error: "Invalid data" });
      return;
    }

    const userId = req.userId!;
    const existing = await prisma.score.findUnique({
      where: { userId_levelId: { userId, levelId } },
    });

    let improvementPoints = 0;
    let created = false;

    if (!existing) {
      improvementPoints = points;
      created = true;
      await prisma.score.create({
        data: { userId, levelId, points, timeSeconds },
      });
    } else {
      const betterPoints = points > existing.points;
      const tieFaster =
        points === existing.points && timeSeconds < existing.timeSeconds;

      if (betterPoints) {
        improvementPoints = points - existing.points;
        await prisma.score.update({
          where: { userId_levelId: { userId, levelId } },
          data: { points, timeSeconds, completedAt: new Date() },
        });
      } else if (tieFaster) {
        await prisma.score.update({
          where: { userId_levelId: { userId, levelId } },
          data: { timeSeconds, completedAt: new Date() },
        });
      }
    }

    let user = null;
    if (improvementPoints > 0) {
      user = await applyPointsAndStreak(userId, improvementPoints);
    }

    const scoreRow = await prisma.score.findUnique({
      where: { userId_levelId: { userId, levelId } },
    });

    res.status(created ? 201 : 200).json({ score: scoreRow, user });
  } catch (e) {
    console.error("POST /scores", e);
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scoreId =
      typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!scoreId) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const owned = await prisma.score.findFirst({
      where: { id: scoreId, userId: req.userId },
    });
    if (!owned) {
      res.status(404).json({ error: "Score not found" });
      return;
    }
    await prisma.score.delete({ where: { id: scoreId } });
    res.json({ message: "Score deleted" });
  } catch {
    res.status(404).json({ error: "Score not found" });
  }
});

export default router;
