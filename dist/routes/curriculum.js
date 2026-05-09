"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const curriculumBootstrap_1 = require("../lib/curriculumBootstrap");
const router = (0, express_1.Router)();
/** JWT-тэй бол UserLessonProgress-оос түгжээ/давуу төлөв тооцож нэгтгэнэ. */
router.get("/bootstrap", auth_1.optionalAuth, async (req, res) => {
    try {
        const payload = await (0, curriculumBootstrap_1.buildCurriculumBootstrapPayload)(req.userId);
        res.json(payload);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load curriculum" });
    }
});
router.get("/chapters", auth_1.optionalAuth, async (req, res) => {
    try {
        const { chapters } = await (0, curriculumBootstrap_1.buildCurriculumBootstrapPayload)(req.userId);
        res.json(chapters);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load chapters" });
    }
});
router.get("/chapters/:chapterId/lessons", auth_1.optionalAuth, async (req, res) => {
    try {
        const { chapterId } = req.params;
        const { lessonsByChapter } = await (0, curriculumBootstrap_1.buildCurriculumBootstrapPayload)(req.userId);
        res.json(lessonsByChapter[chapterId] ?? []);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load lessons" });
    }
});
exports.default = router;
