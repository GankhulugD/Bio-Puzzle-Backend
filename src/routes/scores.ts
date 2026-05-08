import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/leaderboard/:levelId", async (req: Request, res: Response) => {
  const scores = await prisma.score.findMany({
    where: { levelId: Number(req.params.levelId) },
    orderBy: { points: "desc" },
    take: 10,
    include: { user: { select: { username: true } } },
  });
  res.json(scores);
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const scores = await prisma.score.findMany({
    where: { userId: req.userId! },
    include: { level: true },
    orderBy: { completedAt: "desc" },
  });
  res.json(scores);
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { levelId, points, timeSeconds } = req.body;
    const score = await prisma.score.create({
      data: { userId: req.userId!, levelId, points, timeSeconds },
    });
    res.status(201).json(score);
  } catch {
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
