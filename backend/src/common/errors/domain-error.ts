import { AppError } from "./app-error";

export class DomainError extends AppError {
  constructor({
    errorCode,
    data = null,
    cause,
  }: {
    errorCode: string;
    data?: unknown | null;
    cause?: Error;
  }) {
    super({ message: errorCode, errorCode, data, cause });
  }
}
