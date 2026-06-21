import { AppError } from "./app-error";

export class DomainError extends AppError {
    constructor({
        message,
        errorCode,
        data,
        cause,
    }: {
        message: string;
        errorCode: string;
        data?: unknown;
        cause?: Error;
    }) {
        super({ message, errorCode, data, cause });
    }
}
