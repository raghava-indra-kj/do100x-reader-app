import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma-generated";
import { env } from "@core/config/env";
import { logger } from "@core/infra/logger";
import { registerShutdownHandler } from "@core/infra/shutdown";

const adapter = new PrismaMariaDb({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,
  connectionLimit: env.database.connectionLimit,
});

export const prisma = new PrismaClient({ adapter });

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  registerShutdownHandler({ name: "database", disconnect: () => prisma.$disconnect() });
  logger.info("database connected");
}
