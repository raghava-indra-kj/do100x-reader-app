import { ZodError } from "zod";

export type ValidationIssue = {
    field: string;
    message: string;
};

export function formatZodError(error: ZodError): ValidationIssue[] {
    return error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
    }));
}
