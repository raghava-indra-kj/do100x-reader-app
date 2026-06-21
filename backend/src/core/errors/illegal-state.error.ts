import { AppError } from "@core/errors/app-error";

export class IllegalStateError extends AppError {
    constructor({ message, errorCode, data, cause }: { message: string; errorCode?: string; data?: unknown; cause?: Error }) {
        super({ message, errorCode, data, cause });
    }
}
