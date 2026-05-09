"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_PUBLIC_SELECT = void 0;
/** JWT / нэвтрэлтийн хариу болон GET /users/me-д буцаах талбарууд. */
exports.USER_PUBLIC_SELECT = {
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
};
