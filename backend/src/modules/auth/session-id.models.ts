import { z } from "zod";

export const sessionIdSchema = z.uuid({ version: "v4" });
