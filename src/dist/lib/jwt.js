"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signJwtUserId = signJwtUserId;
exports.verifyJwtUserId = verifyJwtUserId;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getSecret = () => {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 16) {
        throw new Error('JWT_SECRET must be set in .env (at least 16 characters for production use longer random string)');
    }
    return s;
};
function signJwtUserId(userId) {
    const opts = {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d'),
    };
    return jsonwebtoken_1.default.sign({ sub: userId }, getSecret(), opts);
}
function verifyJwtUserId(token) {
    const payload = jsonwebtoken_1.default.verify(token, getSecret());
    const sub = payload.sub;
    if (!sub || typeof sub !== 'string')
        throw new Error('Invalid token payload');
    return sub;
}
