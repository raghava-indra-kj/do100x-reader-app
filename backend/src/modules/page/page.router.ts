import { Router } from "express";
import { authMiddleware } from "@modules/auth/auth.middleware";
import { validateReqBody } from "@core/http/validate-req-body.middleware";
import { handleQueryPages, handleGetPage } from "./page.handler";
import { QueryPagesBodySchema } from "./query-pages.models";

const router = Router();

router.post("/pages/query", authMiddleware, validateReqBody(QueryPagesBodySchema), handleQueryPages);
router.get("/pages/:id", authMiddleware, handleGetPage);

export { router as pageRouter };
