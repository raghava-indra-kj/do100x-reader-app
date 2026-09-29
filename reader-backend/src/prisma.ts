import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// All content writers, including MCP, must advance the version. Content updates
// that read a snapshot must carry its version in `where` for compare-and-swap.
prisma.$use(async (params, next) => {
  if (params.model === "page" && ["update", "updateMany"].includes(params.action) && params.args?.data?.content !== undefined) {
    if (params.args.where?.contentVersion === undefined) throw new Error("Page content writes require a contentVersion precondition");
    params.args.data.contentVersion = { increment: 1 };
  }
  return next(params);
});
