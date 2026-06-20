import { z } from "zod";
import { PageIdSchema } from "./create-page.schema";

// Request body for POST /pages/swap.
export const SwapPagesReqSchema = z.object({
  pageId1: PageIdSchema,
  pageId2: PageIdSchema,
});

export type SwapPagesReq = z.infer<typeof SwapPagesReqSchema>;
