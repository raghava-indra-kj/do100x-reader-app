export class AppError extends Error {
    errorCode: string | null;
    constructor(params: { message: string; errorCode?: string | null; cause?: unknown }) {
        super(params.message, { cause: params.cause ?? null });
        this.name = this.constructor.name;
        this.errorCode = params.errorCode ?? null;
    }
}