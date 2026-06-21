import { NextFunction, Request, Response } from "express";
import { CurrentUser } from "@core/models/current-user";

const DUMMY_USER = new CurrentUser({
  id: "00000000-0000-0000-0000-000000000001",
  name: "Dummy User",
  email: "dummy@example.com",
});

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.currentUser = DUMMY_USER;
  next();
}
