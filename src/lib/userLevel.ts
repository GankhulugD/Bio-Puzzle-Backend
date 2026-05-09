/** Нийт онооноос үе тооцох (frontend-тэй ойролцоо темп). */
export function pointsToLevel(totalPoints: number): number {
  return Math.min(99, 1 + Math.floor(Math.max(0, totalPoints) / 400));
}
