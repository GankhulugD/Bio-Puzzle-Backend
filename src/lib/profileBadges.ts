export type BadgeDto = {
  id: string;
  name: string;
  nameMn: string;
  icon: string;
  description: string;
  descriptionMn: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

export function buildProfileBadges(input: {
  lessonsCompleted: number;
  gamesPlayed: number;
  streak: number;
  toothChapterLessonTotal: number;
  toothChapterLessonsDone: number;
  chaptersFullyCompleted: number;
  totalChapters: number;
  hasPerfectChapterQuiz: boolean;
}): BadgeDto[] {
  const gameMasterMax = 10;
  const toothExpertMax = Math.max(1, input.toothChapterLessonTotal);

  return [
    {
      id: "first-lesson",
      name: "First Steps",
      nameMn: "Эхний алхам",
      icon: "📚",
      description: "Complete first lesson",
      descriptionMn: "Эхний хичээлийг дуусгах",
      unlocked: input.lessonsCompleted >= 1,
    },
    {
      id: "perfect-score",
      name: "Perfect Score",
      nameMn: "Төгс оноо",
      icon: "⭐",
      description: "Get 100% on a chapter quiz",
      descriptionMn: "Нэг бүлгийн шалгалтад 100% авах",
      unlocked: input.hasPerfectChapterQuiz,
    },
    {
      id: "week-streak",
      name: "On Fire",
      nameMn: "Галт хүн",
      icon: "🔥",
      description: "7 day streak",
      descriptionMn: "7 өдрийн дараалал",
      unlocked: input.streak >= 7,
    },
    {
      id: "game-master",
      name: "Game Master",
      nameMn: "Тоглоомын мастер",
      icon: "🎮",
      description: "Complete 10 games",
      descriptionMn: "10 тоглоом дуусгах",
      unlocked: input.gamesPlayed >= gameMasterMax,
      progress: Math.min(input.gamesPlayed, gameMasterMax),
      maxProgress: gameMasterMax,
    },
    {
      id: "tooth-expert",
      name: "Tooth Expert",
      nameMn: "Шүдний мэргэжилтэн",
      icon: "🦷",
      description: "Master teeth chapter",
      descriptionMn: "Шүдний бүлгийн хичээлүүдийг дуусгах",
      unlocked: input.toothChapterLessonsDone >= toothExpertMax,
      progress: Math.min(input.toothChapterLessonsDone, toothExpertMax),
      maxProgress: toothExpertMax,
    },
    {
      id: "body-pro",
      name: "Body Expert",
      nameMn: "Биеийн мэргэжилтэн",
      icon: "🏆",
      description: "Complete all chapters",
      descriptionMn: "Бүх бүлэг дуусгах",
      unlocked:
        input.totalChapters > 0 &&
        input.chaptersFullyCompleted >= input.totalChapters,
      progress: input.chaptersFullyCompleted,
      maxProgress: Math.max(1, input.totalChapters),
    },
  ];
}
