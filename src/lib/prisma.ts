import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 requires a driver adapter. PrismaNeon talks to Neon over
// WebSockets using the global WebSocket that Node 22+ provides.
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });

// Reuse one client across dev hot reloads instead of opening a new pool
// every time a module re-evaluates.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
