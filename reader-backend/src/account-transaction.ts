import { Prisma, type PrismaClient } from '@prisma/client';
import { TaskHierarchyError } from './task-errors';

export async function lockAccount(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM appuser WHERE id = ${userId} FOR UPDATE`;
}
/** Serialize mutations to an account, including a retry after a MySQL deadlock. */
export async function accountTransaction<T>(db: PrismaClient, userId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(async tx => { await lockAccount(tx, userId); return work(tx); }, { maxWait: 10000, timeout: 30000 }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error;
      if (attempt >= 2) throw new TaskHierarchyError(409, 'Another change was saved at the same time. Refresh and try again.');
    }
  }
}
