import type { Prisma } from "@prisma/client";

/** JWT / нэвтрэлтийн хариу болон GET /users/me-д буцаах талбарууд. */
export const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  email: true,
  displayNameMn: true,
  streak: true,
  age: true,
  createdAt: true,
  totalPoints: true,
  level: true,
  gamesPlayed: true,
} as const;

export type PublicUserDto = Prisma.UserGetPayload<{
  select: typeof USER_PUBLIC_SELECT;
}>;
