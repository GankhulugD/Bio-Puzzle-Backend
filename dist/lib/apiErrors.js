"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDbOrConfigError = mapDbOrConfigError;
const client_1 = require("@prisma/client");
/** Клиентэд харуулах богино мессеж — нууц мэдээлэл оруулахгүй */
function mapDbOrConfigError(err, fallback) {
    if (err instanceof Error && err.message.includes("JWT_SECRET")) {
        return "Серверийн JWT_SECRET тохируулаагүй эсвэл хэт богино байна (Render Environment Variables).";
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2022") {
            return "Өгөгдлийн сангийн бүтэн шинэчлэл хийгээгүй байна. Deploy дээр prisma migrate deploy ажиллуулна уу.";
        }
        return `Өгөгдлийн сангийн Prisma алдаа (${err.code}). Deploy дээр prisma migrate deploy болон schema sync шалгана уу.`;
    }
    if (err instanceof Error) {
        const m = err.message;
        if (/does not exist.*column|Unknown column|column.*does not exist/i.test(m)) {
            return "Өгөгдлийн сангийн migration (Prisma) ажиллуулна уу — User.totalPoints гэх мэт багана дутуу байна.";
        }
    }
    if (err instanceof client_1.Prisma.PrismaClientInitializationError ||
        (err instanceof Error &&
            /connect|ECONNREFUSED|database/i.test(err.message))) {
        return "Өгөгдлийн сантай холбогдож чадсангүй (DATABASE_URL шалгана уу).";
    }
    return fallback;
}
