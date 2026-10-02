import { PrismaClient } from "@/prisma/generated/client";
import { adapter } from "@/prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // log: ["query"],
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
