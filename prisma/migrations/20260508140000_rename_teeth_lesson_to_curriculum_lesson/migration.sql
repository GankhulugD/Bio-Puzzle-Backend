-- Шүдэнд зориулсан мэт буруу нэртэй хүснэгтийг — бүх бүлгийн хичээлийн хүснэг болгон нэрлэнэ: curriculum_lesson

SET lock_timeout = '30s';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserLessonProgress'
  ) THEN
    ALTER TABLE "UserLessonProgress" DROP CONSTRAINT IF EXISTS "UserLessonProgress_lessonId_fkey";
  END IF;
END $$;

ALTER TABLE "teeth_Lesson" RENAME TO "curriculum_lesson";

ALTER INDEX "teeth_Lesson_pkey" RENAME TO "curriculum_lesson_pkey";
ALTER INDEX "teeth_Lesson_chapterId_idx" RENAME TO "curriculum_lesson_chapterId_idx";

ALTER TABLE "curriculum_lesson" RENAME CONSTRAINT "teeth_Lesson_chapterId_fkey" TO "curriculum_lesson_chapterId_fkey";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserLessonProgress'
  ) THEN
    ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey"
      FOREIGN KEY ("lessonId") REFERENCES "curriculum_lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
