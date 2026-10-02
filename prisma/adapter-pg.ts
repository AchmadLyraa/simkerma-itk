import { PrismaPg } from "@prisma/adapter-pg";

export const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
