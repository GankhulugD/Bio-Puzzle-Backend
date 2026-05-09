import { Request, Response, NextFunction } from "express";
import { verifyJwtUserId } from "../lib/jwt";

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Өөрийн JWT: Authorization Bearer, payload.sub = Prisma User.id
 */
export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    req.userId = verifyJwtUserId(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

/** Bearer байвал userId тохируулна; алдаатай эсвэл дутуу бол зочны горимоор үргэлжлүүлнэ. */
export const optionalAuth = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : null;

  if (!token) {
    next();
    return;
  }

  try {
    req.userId = verifyJwtUserId(token);
  } catch {
    /* үл тоомсорлох */
  }
  next();
};
