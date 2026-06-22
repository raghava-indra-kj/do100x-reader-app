import { Router } from "express";
import { authMiddleware } from "@modules/auth/auth.middleware";
import { validateReqBody } from "@core/http/validate-req-body.middleware";
import {
    handleQueryPages,
    handleCreatePage,
    handleUpdatePage,
    handleDeletePage,
    handleMovePage,
    handleGetPage,
    handleQueryComments,
    handleCreateComment,
    handleUpdateComment,
    handleDeleteComment,
} from "./page.handler";
import { QueryPagesBodySchema } from "./query-pages.models";
import { CreatePageBodySchema } from "./create-page.models";
import { UpdatePageBodySchema } from "./update-page.models";
import { MovePageBodySchema } from "./move-page.models";
import { CreateCommentBodySchema } from "./create-comment.models";
import { UpdateCommentBodySchema } from "./update-comment.models";

const router = Router();

router.post("/pages/query", authMiddleware, validateReqBody(QueryPagesBodySchema), handleQueryPages);
router.post("/pages", authMiddleware, validateReqBody(CreatePageBodySchema), handleCreatePage);
router.post("/pages/:id/comments/query", authMiddleware, handleQueryComments);
router.post("/pages/:id/comments", authMiddleware, validateReqBody(CreateCommentBodySchema), handleCreateComment);
router.post("/pages/:id/comments/:commentId/update", authMiddleware, validateReqBody(UpdateCommentBodySchema), handleUpdateComment);
router.post("/pages/:id/comments/:commentId/delete", authMiddleware, handleDeleteComment);
router.post("/pages/:id/update", authMiddleware, validateReqBody(UpdatePageBodySchema), handleUpdatePage);
router.post("/pages/:id/move", authMiddleware, validateReqBody(MovePageBodySchema), handleMovePage);
router.post("/pages/:id/delete", authMiddleware, handleDeletePage);
router.get("/pages/:id", authMiddleware, handleGetPage);

export { router as pageRouter };
