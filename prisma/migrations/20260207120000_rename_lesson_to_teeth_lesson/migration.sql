-- Шүдний хичээлтэй агуулга: хүснэгийг teeth_Lesson болгон шилжүүлнэ.

ALTER TABLE "Lesson" RENAME TO "teeth_Lesson";
ALTER INDEX "Lesson_chapterId_idx" RENAME TO "teeth_Lesson_chapterId_idx";
ALTER TABLE "teeth_Lesson" RENAME CONSTRAINT "Lesson_pkey" TO "teeth_Lesson_pkey";
ALTER TABLE "teeth_Lesson" RENAME CONSTRAINT "Lesson_chapterId_fkey" TO "teeth_Lesson_chapterId_fkey";
