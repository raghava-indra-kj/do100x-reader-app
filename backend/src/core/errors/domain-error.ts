import { AppError } from "./app-error";

export class DomainError extends AppError {
  constructor({
    message,
    errorCode,
    data = null,
    cause,
  }: {
    message: string;
    errorCode: string;
    data?: unknown | null;
    cause?: Error;
  }) {
    super({ message, errorCode, data, cause });
  }
}
