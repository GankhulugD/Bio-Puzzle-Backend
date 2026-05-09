"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = void 0;
const jwt_1 = require("../lib/jwt");
/**
 * Өөрийн JWT: Authorization Bearer, payload.sub = Prisma User.id
 */
const requireAuth = (req, res, next) => {
    const header = req.headers.authorization;
    const token = typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7).trim()
        : null;
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        req.userId = (0, jwt_1.verifyJwtUserId)(token);
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
exports.requireAuth = requireAuth;
/** Bearer байвал userId тохируулна; алдаатай эсвэл дутуу бол зочны горимоор үргэлжлүүлнэ. */
const optionalAuth = (req, _res, next) => {
    const header = req.headers.authorization;
    const token = typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7).trim()
        : null;
    if (!token) {
        next();
        return;
    }
    try {
        req.userId = (0, jwt_1.verifyJwtUserId)(token);
    }
    catch {
        /* үл тоомсорлох */
    }
    next();
};
exports.optionalAuth = optionalAuth;
