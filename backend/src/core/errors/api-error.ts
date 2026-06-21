import { AppError } from "./app-error";

export class ApiError extends AppError {
  readonly statusCode: number;

  constructor({
    statusCode,
    message,
    errorCode = null,
    data = null,
    cause,
  }: {
    statusCode: number;
    message: string;
    errorCode?: string | null;
    data?: unknown | null;
    cause?: Error;
  }) {
    super({ message, errorCode, data, cause });
    this.statusCode = statusCode;
  }
}
