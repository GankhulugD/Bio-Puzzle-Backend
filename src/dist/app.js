"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const levels_1 = __importDefault(require("./routes/levels"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const scores_1 = __importDefault(require("./routes/scores"));
const curriculum_1 = __importDefault(require("./routes/curriculum"));
function createApp() {
    const app = (0, express_1.default)();
    const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
    app.use((0, cors_1.default)({
        origin: allowedOrigins,
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use("/auth", auth_1.default);
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", uptime: process.uptime() });
    });
    app.use("/users", users_1.default);
    app.use("/levels", levels_1.default);
    app.use("/sessions", sessions_1.default);
    app.use("/scores", scores_1.default);
    app.use("/curriculum", curriculum_1.default);
    return app;
}
