import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { captureVisibilityWhere } from './reader/capture-visibility';

export const prisma = new PrismaClient();

// All content writers, including MCP, must advance the version. Content updates
// that read a snapshot must carry its version in `where` for compare-and-swap.
prisma.$use(async (params, next) => {
  if (params.model === 'page') {
    if (['findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
      params.args ??= {};
      params.args.where = captureVisibilityWhere(params.args.where);
    }
    const data = params.args?.data;
    if (data?.parentId && ['create', 'update', 'updateMany'].includes(params.action)) {
      const parent = await prisma.page.findFirst({ where: { id: data.parentId, captureExpiresAt: null, deletedAt: null }, select: { id: true } });
      if (!parent) throw new Error('Keep a temporary capture before adding or moving pages into it.');
    }
    if ((data?.isPublic || data?.parentId) && ['update', 'updateMany'].includes(params.action) && typeof params.args.where?.id === 'string') {
      const capture = await prisma.page.findFirst({ where: { id: params.args.where.id, captureExpiresAt: { not: null } }, select: { id: true } });
      if (capture && data.captureExpiresAt !== null) throw new Error('Keep this temporary capture before moving or sharing it.');
    }
  }
  if (params.model === "page" && ["update", "updateMany"].includes(params.action) && params.args?.data?.content !== undefined) {
    if (params.args.where?.contentVersion === undefined) throw new Error("Page content writes require a contentVersion precondition");
    params.args.data.contentVersion = { increment: 1 };
  }
  return next(params);
});
