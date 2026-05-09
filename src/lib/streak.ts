/** UTC өдрийг YYYY-MM-DD хэлбэрээр (streak харьцуулахад ижил загвар). */
export function utcDayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetweenUtc(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00.000Z`);
  const tb = Date.parse(`${b}T00:00:00.000Z`);
  return Math.round((tb - ta) / (24 * 60 * 60 * 1000));
}

/**
 * Идэвх болгонд дуудагдана. Ижил UTC өдөр дотор streak өсөхгүй.
 */
export function computeNextStreak(
  currentStreak: number,
  lastActiveDay: string | null,
  today: string,
): { streak: number; lastActiveDay: string } {
  if (!lastActiveDay) {
    return { streak: Math.max(1, currentStreak || 1), lastActiveDay: today };
  }
  if (lastActiveDay === today) {
    return { streak: currentStreak, lastActiveDay: today };
  }
  const gap = daysBetweenUtc(lastActiveDay, today);
  if (gap === 1) {
    return { streak: currentStreak + 1, lastActiveDay: today };
  }
  return { streak: 1, lastActiveDay: today };
}
