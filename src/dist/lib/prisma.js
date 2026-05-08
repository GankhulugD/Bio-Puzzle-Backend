"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const globalForPrisma = globalThis;
function createPrisma() {
    if (process.env.PRISMA_PG_ADAPTER === "true") {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error("DATABASE_URL is required when PRISMA_PG_ADAPTER=true");
        }
        const pool = globalForPrisma.pgPool ?? new pg_1.Pool({ connectionString });
        globalForPrisma.pgPool = pool;
        return new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(pool) });
    }
    return new client_1.PrismaClient();
}
function getClient() {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createPrisma();
    }
    return globalForPrisma.prisma;
}
/**
 * Cloudflare-т deploy хийхэд топ-level Prisma-тэй шууд хандахад `DATABASE_URL` байхгүй
 * validation-д унадаг тул клиентийг анх дамжуулахад л үүсгэнэ (lazy proxy).
 */
exports.prisma = new Proxy({}, {
    get(_target, prop, receiver) {
        const client = getClient();
        const value = Reflect.get(client, prop, receiver);
        return typeof value === "function" ? value.bind(client) : value;
    },
});
