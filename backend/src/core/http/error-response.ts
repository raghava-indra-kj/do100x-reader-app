export type ErrorResponse = {
    errorCode: string | null;
    message: string;
    data?: unknown;
    debugMessage?: string;
    stack?: string;
};
