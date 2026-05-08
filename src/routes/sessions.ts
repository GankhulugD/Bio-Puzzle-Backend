import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.gameSession.findMany({
    where: { userId: req.userId! },
    include: { level: true },
  });
  res.json(sessions);
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { levelId, currentState } = req.body;
    const session = await prisma.gameSession.upsert({
      where: { userId_levelId: { userId: req.userId!, levelId } },
      update: { currentState, updatedAt: new Date() },
      create: { userId: req.userId!, levelId, currentState },
    });
    res.status(201).json(session);
  } catch {
    res.status(400).json({ error: "Invalid data" });
  }
});

router.patch("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId =
      typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!sessionId) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const existing = await prisma.gameSession.findFirst({
      where: { id: sessionId, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const { currentState, isCompleted, timeElapsed, moves } = req.body;
    const session = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { currentState, isCompleted, timeElapsed, moves },
    });
    res.json(session);
  } catch {
    res.status(404).json({ error: "Session not found" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId =
      typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!sessionId) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const existing = await prisma.gameSession.findFirst({
      where: { id: sessionId, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await prisma.gameSession.delete({ where: { id: sessionId } });
    res.json({ message: "Session deleted" });
  } catch {
    res.status(404).json({ error: "Session not found" });
  }
});

export default router;
