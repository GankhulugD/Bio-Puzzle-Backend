import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPrisma(): PrismaClient {
  if (process.env.PRISMA_PG_ADAPTER === "true") {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required when PRISMA_PG_ADAPTER=true");
    }
    const pool =
      globalForPrisma.pgPool ?? new Pool({ connectionString });
    globalForPrisma.pgPool = pool;
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return new PrismaClient();
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma();
  }
  return globalForPrisma.prisma;
}

/**
 * Cloudflare-т deploy хийхэд топ-level Prisma-тэй шууд хандахад `DATABASE_URL` байхгүй
 * validation-д унадаг тул клиентийг анх дамжуулахад л үүсгэнэ (lazy proxy).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
