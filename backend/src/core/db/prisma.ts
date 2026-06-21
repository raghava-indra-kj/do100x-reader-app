import { PrismaClient } from "@prisma/client";
import { registerShutdownHandler } from "@lib/shutdown";

export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  registerShutdownHandler("database", () => prisma.$disconnect());
}
