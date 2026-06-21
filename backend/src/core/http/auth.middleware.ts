import { NextFunction, Request, Response } from "express";
import { prisma } from "@core/db/prisma";
import { ApiError } from "@core/errors/api-error";
import { CurrentUser } from "@core/models/current-user";

function unauthenticated(): ApiError {
  return new ApiError({ statusCode: 401, message: "Unauthenticated", errorCode: "auth.unauthenticated" });
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization;
  if (!token) throw unauthenticated();

  const session = await prisma.session.findFirst({ where: { token, isActive: true } });
  if (!session) throw unauthenticated();

  const user = await prisma.appuser.findUnique({ where: { id: session.userId } });
  if (!user) throw unauthenticated();

  if (!user.homepageId) {
    throw new ApiError({ statusCode: 500, message: "User account is incomplete", errorCode: "user.no_homepage" });
  }

  req.currentUser = new CurrentUser({
    id: user.id,
    name: user.name,
    email: user.email,
    homepageId: user.homepageId,
  });

  next();
}
