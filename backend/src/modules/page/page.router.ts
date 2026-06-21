import { Router } from "express";
import { optionalAuthMiddleware } from "@modules/auth/auth.middleware";
import { handleGetPage } from "./page.handler";

const router = Router();

router.get("/pages/:id", optionalAuthMiddleware, handleGetPage);

export { router as pageRouter };
