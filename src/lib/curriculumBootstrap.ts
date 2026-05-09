import { prisma } from "./prisma";

export type CurriculumLessonPayload = {
  id: string;
  type: string;
  title: string;
  titleMn: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  stars: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  audioText: string;
  questions: unknown;
};

export type CurriculumChapterPayload = {
  id: string;
  title: string;
  titleMn: string;
  iconType: string;
  color: string;
  sortOrder: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  progress: number;
  totalLessons: number;
  completedLessons: number;
};

export async function buildCurriculumBootstrapPayload(
  userId: string | undefined,
): Promise<{
  chapters: CurriculumChapterPayload[];
  lessonsByChapter: Record<string, CurriculumLessonPayload[]>;
  teethGameParts: unknown;
}> {
  const [chapterRows, lessonRows, blobs] = await Promise.all([
    prisma.chapter.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.curriculumLesson.findMany({
      orderBy: [{ chapterId: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.appContent.findMany(),
  ]);

  const teethGameParts =
    blobs.find((b) => b.key === "teeth_game_parts")?.data ?? null;

  const progressByLesson = new Map<
    string,
    { completed: boolean; stars: number }
  >();

  if (userId) {
    const prog = await prisma.userLessonProgress.findMany({
      where: { userId },
      select: { lessonId: true, completed: true, stars: true },
    });
    for (const p of prog) {
      progressByLesson.set(p.lessonId, {
        completed: p.completed,
        stars: p.stars,
      });
    }
  }

  const chaptersSorted = [...chapterRows].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const lessonsByChapter: Record<string, CurriculumLessonPayload[]> = {};
  const chaptersOut: CurriculumChapterPayload[] = [];

  let prevChapterCompleted = true;

  for (const ch of chaptersSorted) {
    const list = lessonRows
      .filter((l) => l.chapterId === ch.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const totalLessons = list.length;
    let completedLessons = 0;

    const chapterUnlocked = prevChapterCompleted;

    const mappedLessons: CurriculumLessonPayload[] = [];

    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      const prog = progressByLesson.get(row.id);
      const isCompleted = Boolean(prog?.completed);
      const stars = prog?.stars ?? 0;
      if (isCompleted) completedLessons++;

      const prevLessonDone =
        i === 0 ? true : Boolean(progressByLesson.get(list[i - 1].id)?.completed);
      const lessonUnlocked = chapterUnlocked && prevLessonDone;

      mappedLessons.push({
        id: row.id,
        type: row.type,
        title: row.title,
        titleMn: row.titleMn,
        isUnlocked: lessonUnlocked,
        isCompleted,
        stars,
        question: row.question,
        options: row.options as string[],
        correctAnswer: row.correctAnswer,
        explanation: row.explanation,
        audioText: row.audioText,
        questions: row.questionsJson,
      });
    }

    lessonsByChapter[ch.id] = mappedLessons;

    const chapterCompleted =
      totalLessons === 0 ? true : completedLessons === totalLessons;

    const progress =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100);

    chaptersOut.push({
      id: ch.id,
      title: ch.title,
      titleMn: ch.titleMn,
      iconType: ch.iconType,
      color: ch.color,
      sortOrder: ch.sortOrder,
      isUnlocked: chapterUnlocked,
      isCompleted: chapterCompleted,
      progress,
      totalLessons,
      completedLessons,
    });

    prevChapterCompleted = chapterCompleted;
  }

  return {
    chapters: chaptersOut,
    lessonsByChapter,
    teethGameParts,
  };
}
