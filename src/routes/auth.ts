import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { signJwtUserId } from "../lib/jwt";
import { USER_PUBLIC_SELECT } from "../lib/userDto";
import { mapDbOrConfigError } from "../lib/apiErrors";

const router = Router();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function baseUsernameFromEmail(email: string) {
  const local = email.split("@")[0];
  return local.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 48) || "user";
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      username: rawUsername,
    } = req.body as {
      email?: string;
      password?: string;
      username?: string;
    };

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const emailNorm = normalizeEmail(email);
    if (!emailNorm.includes("@")) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: emailNorm },
    });
    if (existingEmail) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    let usernameCandidate =
      typeof rawUsername === "string" && rawUsername.trim().length >= 2
        ? rawUsername.trim().slice(0, 48).replace(/\s+/g, "_")
        : baseUsernameFromEmail(emailNorm);

    const passwordHash = await bcrypt.hash(password, 12);

    type PublicUser = {
      id: string;
      email: string;
      username: string;
      displayNameMn: string | null;
      streak: number;
      age: number | null;
      createdAt: Date;
      totalPoints: number;
      level: number;
      gamesPlayed: number;
    };

    let user: PublicUser | null = null;

    for (let i = 0; i < 8; i++) {
      try {
        user = await prisma.user.create({
          data: {
            email: emailNorm,
            passwordHash,
            username: usernameCandidate,
          },
          select: USER_PUBLIC_SELECT,
        });
        break;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          usernameCandidate = `${baseUsernameFromEmail(emailNorm)}_${Math.random().toString(36).slice(2, 10)}`;
          continue;
        }
        throw e;
      }
    }

    if (!user) {
      res.status(500).json({ error: "Could not create user" });
      return;
    }

    const token = signJwtUserId(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("POST /auth/register error", err);
    res.status(500).json({
      error: mapDbOrConfigError(err, "Бүртгэл амжилтгүй"),
    });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailNorm = normalizeEmail(email);
    const row = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (
      !row?.passwordHash ||
      !(await bcrypt.compare(password, row.passwordHash))
    ) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: row.id },
      select: USER_PUBLIC_SELECT,
    });

    const token = signJwtUserId(row.id);
    res.json({ token, user });
  } catch (err) {
    console.error("POST /auth/login error", err);
    res.status(500).json({
      error: mapDbOrConfigError(err, "Нэвтрэлт амжилтгүй"),
    });
  }
});

export default router;
