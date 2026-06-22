import { z } from "zod";

export const commentIdSchema = z.uuid({ version: "v4" });
