import { z } from "zod";

export const credentialsSchema = z.object({
  username: z.string().min(1, "Username is required").max(255, "Username must be 255 characters or fewer")
    .refine((value) => value.trim().length > 0, "Username is required"),
  password: z.string().min(1, "Password is required").max(255, "Password must be 255 characters or fewer")
    .refine((value) => value.trim().length > 0, "Password is required"),
}).strict();
