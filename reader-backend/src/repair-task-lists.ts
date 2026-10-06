import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { planTaskListRepair, taskHierarchyTransaction, TaskHierarchyError } from "./task-hierarchy";

const usage = "Usage: node reader-backend/dist/repair-task-lists.js --profile development|production --user-id UUID [--apply]\nWithout --apply, only previews changes. No schema changes or resets.";

export async function repairTaskLists(db: PrismaClient, userId: string, apply = false) {
  return taskHierarchyTransaction(db, async tx => {
    if (!await tx.appuser.findUnique({ where: { id: userId } })) throw new TaskHierarchyError(404, "Account not found.");
    const [tasks, lists] = await Promise.all([
      tx.task.findMany({ where: { userId, deletedAt: null }, select: { id: true, userId: true, parentId: true, listId: true, deletedAt: true } }),
      tx.task_list.findMany({ where: { userId, deletedAt: null }, select: { id: true, userId: true, deletedAt: true } }),
    ]);
    const plan = planTaskListRepair(userId, tasks, lists);
    if (apply) {
      for (const change of plan.changes) {
        await tx.task.update({ where: { id: change.id, userId, deletedAt: null }, data: { listId: change.toListId, updatedAt: new Date() } });
      }
    }
    return plan;
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") { console.log(usage); return; }
  let profile = "", userId = "", apply = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--profile" && !profile) profile = args[++i] ?? "";
    else if (args[i] === "--user-id" && !userId) userId = args[++i] ?? "";
    else if (args[i] === "--apply" && !apply) apply = true;
    else throw new Error(usage);
  }
  if (!["development", "production"].includes(profile) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) throw new Error(usage);
  const { readProfile } = require(path.resolve(__dirname, "../../scripts/environment.cjs"));
  const { values } = readProfile(profile);
  const db = new PrismaClient({ datasources: { db: { url: values.DATABASE_URL } } });
  try {
    const result = await repairTaskLists(db, userId, apply);
    console.log(JSON.stringify({ profile, userId, mode: apply ? "applied" : "preview", changedCount: result.changes.length, skippedCount: result.issues.length, ...result }, null, 2));
  } catch (error) {
    if (error instanceof TaskHierarchyError) throw error;
    throw new Error("Repair failed; no changes were committed.");
  } finally { await db.$disconnect(); }
}

if (require.main === module) main().catch(error => {
  // Avoid printing Prisma diagnostics that may include connection information.
  console.error(error instanceof Error ? error.message : "Repair failed; no changes were committed.");
  process.exitCode = 1;
});
