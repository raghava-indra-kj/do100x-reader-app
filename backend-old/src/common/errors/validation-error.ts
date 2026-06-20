import { AppError } from "./app-error";

export class ValidationError extends AppError {
  constructor({
    errorCode,
    message,
    data,
  }: {
    errorCode: string;
    message: string;
    data?: unknown | null;
  }) {
    super({
      errorCode: errorCode,
      message: message,
      data: data ?? null
    });
  }
}