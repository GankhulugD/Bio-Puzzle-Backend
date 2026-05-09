"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointsToLevel = pointsToLevel;
/** Нийт онооноос үе тооцох (frontend-тэй ойролцоо темп). */
function pointsToLevel(totalPoints) {
    return Math.min(99, 1 + Math.floor(Math.max(0, totalPoints) / 400));
}
