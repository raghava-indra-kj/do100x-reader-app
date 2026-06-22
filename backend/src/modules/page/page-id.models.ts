import { z } from "zod";

export const pageIdSchema = z.uuid({ version: "v4" });
