"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
const userDto_1 = require("../lib/userDto");
const apiErrors_1 = require("../lib/apiErrors");
const router = (0, express_1.Router)();
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function baseUsernameFromEmail(email) {
    const local = email.split("@")[0];
    return local.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 48) || "user";
}
router.post("/register", async (req, res) => {
    try {
        const { email, password, username: rawUsername, } = req.body;
        if (!email || typeof email !== "string") {
            res.status(400).json({ error: "Email is required" });
            return;
        }
        const emailNorm = normalizeEmail(email);
        if (!emailNorm.includes("@")) {
            res.status(400).json({ error: "Invalid email" });
            return;
        }
        if (!password || typeof password !== "string" || password.length < 8) {
            res.status(400).json({ error: "Password must be at least 8 characters" });
            return;
        }
        const existingEmail = await prisma_1.prisma.user.findUnique({
            where: { email: emailNorm },
        });
        if (existingEmail) {
            res.status(409).json({ error: "Email already registered" });
            return;
        }
        let usernameCandidate = typeof rawUsername === "string" && rawUsername.trim().length >= 2
            ? rawUsername.trim().slice(0, 48).replace(/\s+/g, "_")
            : baseUsernameFromEmail(emailNorm);
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        let user = null;
        for (let i = 0; i < 8; i++) {
            try {
                user = await prisma_1.prisma.user.create({
                    data: {
                        email: emailNorm,
                        passwordHash,
                        username: usernameCandidate,
                    },
                    select: userDto_1.USER_PUBLIC_SELECT,
                });
                break;
            }
            catch (e) {
                if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    e.code === "P2002") {
                    usernameCandidate = `${baseUsernameFromEmail(emailNorm)}_${Math.random().toString(36).slice(2, 10)}`;
                    continue;
                }
                throw e;
            }
        }
        if (!user) {
            res.status(500).json({ error: "Could not create user" });
            return;
        }
        const token = (0, jwt_1.signJwtUserId)(user.id);
        res.status(201).json({ token, user });
    }
    catch (err) {
        console.error("POST /auth/register error", err);
        res.status(500).json({
            error: (0, apiErrors_1.mapDbOrConfigError)(err, "Бүртгэл амжилтгүй"),
        });
    }
});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email ||
            typeof email !== "string" ||
            !password ||
            typeof password !== "string") {
            res.status(400).json({ error: "Email and password are required" });
            return;
        }
        const emailNorm = normalizeEmail(email);
        const row = await prisma_1.prisma.user.findUnique({ where: { email: emailNorm } });
        if (!row?.passwordHash ||
            !(await bcryptjs_1.default.compare(password, row.passwordHash))) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        const user = await prisma_1.prisma.user.findUniqueOrThrow({
            where: { id: row.id },
            select: userDto_1.USER_PUBLIC_SELECT,
        });
        const token = (0, jwt_1.signJwtUserId)(row.id);
        res.json({ token, user });
    }
    catch (err) {
        console.error("POST /auth/login error", err);
        res.status(500).json({
            error: (0, apiErrors_1.mapDbOrConfigError)(err, "Нэвтрэлт амжилтгүй"),
        });
    }
});
exports.default = router;
