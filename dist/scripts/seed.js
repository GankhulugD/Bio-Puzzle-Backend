"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Curriculum / AppContent өгөгдлийг DB-д оруулах (`npm run db:seed` эсвэл `prisma db seed`).
 */
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
function loadJson(name) {
    const file = path.join(process.cwd(), "prisma", "data", name);
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
}
async function seedLessons(chapterId, lessons) {
    for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        await prisma.curriculumLesson.create({
            data: {
                id: l.id,
                chapterId,
                type: l.type,
                title: l.title,
                titleMn: l.titleMn,
                sortOrder: i,
                question: l.question,
                options: l.options,
                correctAnswer: l.correctAnswer,
                explanation: l.explanation,
                audioText: l.audioText,
                questionsJson: (l.questions ?? []),
                isUnlocked: l.isUnlocked,
                isCompleted: l.isCompleted,
            },
        });
    }
}
async function syncChapterLessonCounts() {
    const rows = await prisma.chapter.findMany({ select: { id: true } });
    for (const { id } of rows) {
        const n = await prisma.curriculumLesson.count({ where: { chapterId: id } });
        await prisma.chapter.update({
            where: { id },
            data: { totalLessons: n },
        });
    }
}
async function main() {
    const chapters = loadJson("chapters.json");
    const teethLessons = loadJson("teethLessons.json");
    const boneLessons = loadJson("boneLessons.json");
    const heartLessons = loadJson("heartLessons.json");
    const musclesLessons = loadJson("musclesLessons.json");
    const digestionLessons = loadJson("digestionLessons.json");
    const brainLessons = loadJson("brainLessons.json");
    const bloodLessons = loadJson("bloodLessons.json");
    const teethGameParts = loadJson("teethGameParts.json");
    await prisma.curriculumLesson.deleteMany();
    await prisma.chapter.deleteMany();
    await prisma.appContent.deleteMany();
    for (let i = 0; i < chapters.length; i++) {
        const c = chapters[i];
        await prisma.chapter.create({
            data: {
                id: c.id,
                title: c.title,
                titleMn: c.titleMn,
                iconType: c.iconType,
                color: c.color,
                sortOrder: i,
                isUnlocked: c.isUnlocked,
                isCompleted: c.isCompleted,
                progress: c.progress,
                totalLessons: c.totalLessons,
                completedLessons: c.completedLessons,
            },
        });
    }
    await seedLessons("teeth", teethLessons);
    await seedLessons("bones", boneLessons);
    await seedLessons("heart", heartLessons);
    await seedLessons("muscles", musclesLessons);
    await seedLessons("digestion", digestionLessons);
    await seedLessons("brain", brainLessons);
    await seedLessons("blood", bloodLessons);
    await syncChapterLessonCounts();
    await prisma.appContent.create({
        data: { key: "teeth_game_parts", data: teethGameParts },
    });
    console.log(`Seeded ${chapters.length} chapters; lessons teeth=${teethLessons.length} bones=${boneLessons.length} heart=${heartLessons.length} muscles=${musclesLessons.length} digestion=${digestionLessons.length} brain=${brainLessons.length} blood=${bloodLessons.length}; AppContent teeth_game_parts.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
