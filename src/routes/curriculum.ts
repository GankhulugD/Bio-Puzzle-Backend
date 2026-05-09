import { Router } from "express";
import { optionalAuth, type AuthRequest } from "../middleware/auth";
import { buildCurriculumBootstrapPayload } from "../lib/curriculumBootstrap";

const router = Router();

/** JWT-тэй бол UserLessonProgress-оос түгжээ/давуу төлөв тооцож нэгтгэнэ. */
router.get("/bootstrap", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const payload = await buildCurriculumBootstrapPayload(req.userId);
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load curriculum" });
  }
});

router.get("/chapters", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { chapters } = await buildCurriculumBootstrapPayload(req.userId);
    res.json(chapters);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load chapters" });
  }
});

router.get("/chapters/:chapterId/lessons", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { chapterId } = req.params;
    const { lessonsByChapter } = await buildCurriculumBootstrapPayload(req.userId);
    res.json(lessonsByChapter[chapterId] ?? []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load lessons" });
  }
});

export default router;
