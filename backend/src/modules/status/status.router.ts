import { Router } from "express";
import { handleStatus } from "./status.handler";

const router = Router();

router.get("/status", handleStatus);

export { router as statusRouter };
