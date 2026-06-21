import { AppError } from "./app-error";

export class ApiError extends AppError {
    readonly statusCode: number;

    constructor({
        statusCode,
        message,
        errorCode = null,
        data,
        cause,
    }: {
        statusCode: number;
        message: string;
        errorCode?: string | null;
        data?: unknown;
        cause?: Error;
    }) {
        super({ message, errorCode, data, cause });
        this.statusCode = statusCode;
    }
}
