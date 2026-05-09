/**
 * Curriculum / AppContent өгөгдлийг DB-д оруулах (`npm run db:seed` эсвэл `prisma db seed`).
 */
import { Prisma, PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

type ChapterJson = {
  id: string;
  title: string;
  titleMn: string;
  iconType: string;
  color: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  progress: number;
  totalLessons: number;
  completedLessons: number;
};

type LessonJson = {
  id: string;
  type: string;
  title: string;
  titleMn: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  audioText: string;
  questions: unknown[];
};

function loadJson<T>(name: string): T {
  const file = path.join(process.cwd(), "prisma", "data", name);
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as T;
}

async function seedLessons(chapterId: string, lessons: LessonJson[]) {
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
        questionsJson: (l.questions ?? []) as Prisma.InputJsonValue,
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
  const chapters = loadJson<ChapterJson[]>("chapters.json");
  const teethLessons = loadJson<LessonJson[]>("teethLessons.json");
  const boneLessons = loadJson<LessonJson[]>("boneLessons.json");
  const heartLessons = loadJson<LessonJson[]>("heartLessons.json");
  const musclesLessons = loadJson<LessonJson[]>("musclesLessons.json");
  const digestionLessons = loadJson<LessonJson[]>("digestionLessons.json");
  const brainLessons = loadJson<LessonJson[]>("brainLessons.json");
  const bloodLessons = loadJson<LessonJson[]>("bloodLessons.json");
  const teethGameParts = loadJson<unknown>("teethGameParts.json");

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
    data: { key: "teeth_game_parts", data: teethGameParts as object },
  });

  console.log(
    `Seeded ${chapters.length} chapters; lessons teeth=${teethLessons.length} bones=${boneLessons.length} heart=${heartLessons.length} muscles=${musclesLessons.length} digestion=${digestionLessons.length} brain=${brainLessons.length} blood=${bloodLessons.length}; AppContent teeth_game_parts.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
