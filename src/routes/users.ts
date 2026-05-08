import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const publicSelect = {
  id: true,
  username: true,
  email: true,
  streak: true,
  age: true,
  createdAt: true,
} as const;

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: publicSelect,
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
    const { username, age } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(username !== undefined && { username }),
        ...(age !== undefined && { age }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        age: true,
        streak: true,
      },
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
