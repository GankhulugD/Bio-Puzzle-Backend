import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import levelRoutes from "./routes/levels";
import sessionRoutes from "./routes/sessions";
import scoreRoutes from "./routes/scores";
import curriculumRoutes from "./routes/curriculum";
import progressRoutes from "./routes/progress";
import leaderboardRoutes from "./routes/leaderboard";

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(express.json());

  app.use("/auth", authRoutes);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/users", userRoutes);
  app.use("/levels", levelRoutes);
  app.use("/sessions", sessionRoutes);
  app.use("/scores", scoreRoutes);
  app.use("/curriculum", curriculumRoutes);
  app.use("/progress", progressRoutes);
  app.use("/leaderboard", leaderboardRoutes);

  return app;
}
